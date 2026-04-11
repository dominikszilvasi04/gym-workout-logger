"""
Controller layer for user registration and authentication routes.
"""
import logging
from pathlib import Path
from flask import Blueprint, Response, current_app, render_template, request, redirect, url_for, flash, session, jsonify
from flask import send_from_directory
from authlib.integrations.flask_client import OAuth
from application.authentication import login_required
from application.security import limiter
from application.security import get_or_create_csrf_token
from application.services import application_user_service, application_workout_service

logger = logging.getLogger(__name__)
auth_blueprint = Blueprint("auth_controller", __name__, template_folder="../templates")

def is_google_login_enabled() -> bool:
    """
    Determines whether Google OAuth login is configured and enabled.
    """
    return bool(
        current_app.config.get("GOOGLE_OAUTH_ENABLED")
        and current_app.config.get("GOOGLE_CLIENT_ID")
        and current_app.config.get("GOOGLE_CLIENT_SECRET")
    )

def create_google_oauth_client():
    """
    Creates a configured Authlib Google OAuth client for the current request.
    """
    oauth_for_request = OAuth(current_app)
    oauth_for_request.register(
        name="google",
        client_id=current_app.config.get("GOOGLE_CLIENT_ID"),
        client_secret=current_app.config.get("GOOGLE_CLIENT_SECRET"),
        server_metadata_url=current_app.config.get("GOOGLE_DISCOVERY_URL"),
        client_kwargs={"scope": "openid email profile"},
    )
    return oauth_for_request.create_client("google")

def get_authenticated_user_identifier() -> str | None:
    """
    Retrieves the logged-in user's identifier from session state.
    """
    return session.get("user_identifier")


def should_return_json_response() -> bool:
    if request.path.startswith("/api/"):
        return True
    if request.is_json:
        return True
    accepted_mimetypes = request.accept_mimetypes
    return accepted_mimetypes.accept_json and not accepted_mimetypes.accept_html


def render_react_application_if_available() -> Response | None:
    frontend_dist_directory = current_app.config.get("FRONTEND_DIST_DIRECTORY")
    if not frontend_dist_directory:
        return None
    frontend_index_file = Path(frontend_dist_directory) / "index.html"
    if not frontend_index_file.exists():
        return None
    return send_from_directory(frontend_dist_directory, "index.html")

@auth_blueprint.route("/register", methods=["GET", "POST"])
@limiter.limit(lambda: "120 per minute" if request.method == "GET" else "60 per minute")
def register() -> str | tuple[str, int] | Response:
    """
    Renders and handles account registration.
    """
    if request.method == "GET":
        react_application_response = render_react_application_if_available()
        if react_application_response:
            return react_application_response
        return render_template("register.html", google_login_enabled=is_google_login_enabled())

    payload = request.get_json(silent=True) if request.is_json else None
    email = (payload.get("email", "") if payload else request.form.get("email", "")).strip()
    password = payload.get("password", "") if payload else request.form.get("password", "")
    display_name = (payload.get("display_name", "") if payload else request.form.get("display_name", "")).strip()
    success, result = application_user_service.register_user(
        email=email,
        password=password,
        display_name=display_name
    )
    if not success:
        if should_return_json_response():
            return jsonify({"error": result}), 400
        flash(result, "danger")
        return render_template("register.html", google_login_enabled=is_google_login_enabled()), 400
    user = application_user_service.authenticate_user(email=email, password=password)
    if not user:
        if should_return_json_response():
            return jsonify({"error": "Account created, but automatic login failed."}), 500
        flash("Account created, but automatic login failed. Please log in.", "warning")
        return redirect(url_for("auth_controller.login"))
    session.clear()
    session["user_identifier"] = user.identifier
    session["user_email"] = user.email
    session["user_display_name"] = user.display_name or user.email
    get_or_create_csrf_token()
    logger.info("User registered and logged in: user_identifier=%s", user.identifier)
    if should_return_json_response():
        return jsonify(user.model_dump(by_alias=True, exclude={"password_hash"})), 201
    flash("Registration successful. Welcome!", "success")
    return redirect(url_for("workout_controller.view_dashboard"))

@auth_blueprint.route("/login", methods=["GET", "POST"])
@limiter.limit(lambda: "120 per minute" if request.method == "GET" else "60 per minute")
def login() -> str | tuple[str, int] | Response:
    """
    Renders and handles user login.
    """
    if request.method == "GET":
        react_application_response = render_react_application_if_available()
        if react_application_response:
            return react_application_response
        return render_template("login.html", google_login_enabled=is_google_login_enabled())
    payload = request.get_json(silent=True) if request.is_json else None
    email = (payload.get("email", "") if payload else request.form.get("email", "")).strip()
    password = payload.get("password", "") if payload else request.form.get("password", "")
    authenticated_user = application_user_service.authenticate_user(email=email, password=password)
    if not authenticated_user:
        if should_return_json_response():
            return jsonify({"error": "Invalid email or password."}), 401
        flash("Invalid email or password.", "danger")
        return render_template("login.html", google_login_enabled=is_google_login_enabled()), 401
    session.clear()
    session["user_identifier"] = authenticated_user.identifier
    session["user_email"] = authenticated_user.email
    session["user_display_name"] = authenticated_user.display_name or authenticated_user.email
    get_or_create_csrf_token()
    logger.info("User logged in: user_identifier=%s", authenticated_user.identifier)
    if should_return_json_response():
        return jsonify(authenticated_user.model_dump(by_alias=True, exclude={"password_hash"})), 200
    flash("Logged in successfully.", "success")
    return redirect(url_for("workout_controller.view_dashboard"))

@auth_blueprint.route("/login/google", methods=["GET"])
@limiter.limit("60 per minute")
def login_with_google() -> Response:
    """
    Starts the Google OAuth authorization flow.
    """
    if not is_google_login_enabled():
        flash("Google login is not configured yet.", "warning")
        return redirect(url_for("auth_controller.login"))
    google_oauth_client = create_google_oauth_client()
    redirect_uri = url_for("auth_controller.google_oauth_callback", _external=True)
    return google_oauth_client.authorize_redirect(redirect_uri)

@auth_blueprint.route("/auth/google/callback", methods=["GET"])
@limiter.limit("60 per minute")
def google_oauth_callback() -> Response:
    """
    Handles Google OAuth callback and signs in (or creates) a user.
    """
    if not is_google_login_enabled():
        flash("Google login is not configured yet.", "warning")
        return redirect(url_for("auth_controller.login"))
    google_oauth_client = create_google_oauth_client()
    try:
        token = google_oauth_client.authorize_access_token()
    except Exception:
        logger.exception("Google OAuth token exchange failed.")
        flash("Google login failed during token exchange.", "danger")
        return redirect(url_for("auth_controller.login"))
    user_info = token.get("userinfo") if isinstance(token, dict) else None
    if not user_info:
        try:
            user_info_response = google_oauth_client.get("userinfo")
            user_info = user_info_response.json() if user_info_response else {}
        except Exception:
            logger.exception("Google OAuth userinfo request failed.")
            flash("Google login failed while retrieving profile info.", "danger")
            return redirect(url_for("auth_controller.login"))
    email = str(user_info.get("email", "")).strip().lower()
    google_subject = str(user_info.get("sub", "")).strip()
    email_verified = bool(user_info.get("email_verified", False))
    display_name = str(user_info.get("name", "")).strip() or None
    if not email or not google_subject or not email_verified:
        flash("Google account details are incomplete or email is not verified.", "danger")
        return redirect(url_for("auth_controller.login"))
    authenticated_user = application_user_service.authenticate_or_register_google_user(
        email=email,
        google_subject=google_subject,
        display_name=display_name,
    )
    if not authenticated_user:
        flash("Unable to sign in with Google for this account.", "danger")
        return redirect(url_for("auth_controller.login"))
    session.clear()
    session["user_identifier"] = authenticated_user.identifier
    session["user_email"] = authenticated_user.email
    session["user_display_name"] = authenticated_user.display_name or authenticated_user.email
    logger.info("User logged in with Google: user_identifier=%s", authenticated_user.identifier)
    flash("Logged in with Google successfully.", "success")
    return redirect(url_for("workout_controller.view_dashboard"))

@auth_blueprint.route("/login/google", methods=["GET"])
@limiter.limit("60 per minute")
def login_with_google() -> Response:
    """
    Starts the Google OAuth authorization flow.
    """
    if not is_google_login_enabled():
        flash("Google login is not configured yet.", "warning")
        return redirect(url_for("auth_controller.login"))
    google_oauth_client = create_google_oauth_client()
    redirect_uri = url_for("auth_controller.google_oauth_callback", _external=True)
    return google_oauth_client.authorize_redirect(redirect_uri)


@auth_blueprint.route("/auth/google/callback", methods=["GET"])
@limiter.limit("60 per minute")
def google_oauth_callback() -> Response:
    """
    Handles Google OAuth callback and signs in (or creates) a user.
    """
    if not is_google_login_enabled():
        flash("Google login is not configured yet.", "warning")
        return redirect(url_for("auth_controller.login"))

    google_oauth_client = create_google_oauth_client()
    try:
        token = google_oauth_client.authorize_access_token()
    except Exception:
        logger.exception("Google OAuth token exchange failed.")
        flash("Google login failed during token exchange.", "danger")
        return redirect(url_for("auth_controller.login"))

    user_info = token.get("userinfo") if isinstance(token, dict) else None
    if not user_info:
        try:
            user_info_response = google_oauth_client.get("userinfo")
            user_info = user_info_response.json() if user_info_response else {}
        except Exception:
            logger.exception("Google OAuth userinfo request failed.")
            flash("Google login failed while retrieving profile info.", "danger")
            return redirect(url_for("auth_controller.login"))

    email = str(user_info.get("email", "")).strip().lower()
    google_subject = str(user_info.get("sub", "")).strip()
    email_verified = bool(user_info.get("email_verified", False))
    display_name = str(user_info.get("name", "")).strip() or None

    if not email or not google_subject or not email_verified:
        flash("Google account details are incomplete or email is not verified.", "danger")
        return redirect(url_for("auth_controller.login"))

    authenticated_user = application_user_service.authenticate_or_register_google_user(
        email=email,
        google_subject=google_subject,
        display_name=display_name,
    )
    if not authenticated_user:
        flash("Unable to sign in with Google for this account.", "danger")
        return redirect(url_for("auth_controller.login"))

    session.clear()
    session["user_identifier"] = authenticated_user.identifier
    session["user_email"] = authenticated_user.email
    session["user_display_name"] = authenticated_user.display_name or authenticated_user.email
    logger.info("User logged in with Google: user_identifier=%s", authenticated_user.identifier)
    flash("Logged in with Google successfully.", "success")
    return redirect(url_for("workout_controller.view_dashboard"))

@auth_blueprint.route("/logout", methods=["POST"])
@limiter.limit("60 per minute")
def logout() -> Response:
    """
    Logs the current user out and clears the session.
    """
    user_identifier = session.get("user_identifier")
    session.pop("user_identifier", None)
    session.pop("user_email", None)
    session.pop("user_display_name", None)
    session.pop("csrf_token", None)
    logger.info("User logged out: user_identifier=%s", user_identifier)
    if should_return_json_response():
        return jsonify({"message": "Logged out successfully."}), 200
    flash("Logged out successfully.", "success")
    return redirect(url_for("workout_controller.view_dashboard"))


@auth_blueprint.route("/api/auth/csrf", methods=["GET"])
def get_csrf_token_endpoint() -> tuple[Response, int]:
    csrf_token = get_or_create_csrf_token()
    return jsonify({"csrf_token": csrf_token}), 200


@auth_blueprint.route("/api/auth/me", methods=["GET"])
@login_required
def get_current_user_endpoint() -> tuple[Response, int]:
    user_identifier = get_authenticated_user_identifier()
    user = application_user_service.retrieve_user(user_identifier)
    if not user:
        return jsonify({"error": "User not found."}), 404
    return jsonify(user.model_dump(by_alias=True, exclude={"password_hash"})), 200

@auth_blueprint.route("/profile", methods=["GET"])
@login_required
def profile() -> str | Response:
    """
    Renders the authenticated user's profile and workout summary.
    """
    react_application_response = render_react_application_if_available()
    if react_application_response:
        return react_application_response

    user_identifier = get_authenticated_user_identifier()
    user = application_user_service.retrieve_user(user_identifier)
    if not user:
        session.pop("user_identifier", None)
        session.pop("user_email", None)
        session.pop("user_display_name", None)
        flash("Your account could not be loaded. Please log in again.", "danger")
        return redirect(url_for("auth_controller.login"))

    profile_summary = application_workout_service.build_profile_summary(user_identifier=user_identifier)
    logger.info("Profile page requested for user_identifier=%s", user_identifier)
    return render_template("profile.html", user=user, profile_summary=profile_summary)
