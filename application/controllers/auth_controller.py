"""
Controller layer for user registration and authentication routes.
"""
import logging
from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from application.authentication import login_required
from application.services import application_user_service, application_workout_service

logger = logging.getLogger(__name__)
auth_blueprint = Blueprint("auth_controller", __name__, template_folder="../templates")

def get_authenticated_user_identifier() -> str | None:
    """
    Retrieves the logged-in user's identifier from session state.
    """
    return session.get("user_identifier")

@auth_blueprint.route("/register", methods=["GET", "POST"])
def register() -> str:
    """
    Renders and handles account registration.
    """
    if request.method == "GET":
        return render_template("register.html")

    email = request.form.get("email", "").strip()
    password = request.form.get("password", "")
    display_name = request.form.get("display_name", "").strip()
    success, result = application_user_service.register_user(
        email=email,
        password=password,
        display_name=display_name
    )
    if not success:
        flash(result, "danger")
        return render_template("register.html"), 400
    user = application_user_service.authenticate_user(email=email, password=password)
    if not user:
        flash("Account created, but automatic login failed. Please log in.", "warning")
        return redirect(url_for("auth_controller.login"))
    session["user_identifier"] = user.identifier
    session["user_email"] = user.email
    session["user_display_name"] = user.display_name or user.email
    logger.info("User registered and logged in: user_identifier=%s", user.identifier)
    flash("Registration successful. Welcome!", "success")
    return redirect(url_for("workout_controller.view_dashboard"))

@auth_blueprint.route("/login", methods=["GET", "POST"])
def login() -> str:
    """
    Renders and handles user login.
    """
    if request.method == "GET":
        return render_template("login.html")
    email = request.form.get("email", "").strip()
    password = request.form.get("password", "")
    authenticated_user = application_user_service.authenticate_user(email=email, password=password)
    if not authenticated_user:
        flash("Invalid email or password.", "danger")
        return render_template("login.html"), 401
    session["user_identifier"] = authenticated_user.identifier
    session["user_email"] = authenticated_user.email
    session["user_display_name"] = authenticated_user.display_name or authenticated_user.email
    logger.info("User logged in: user_identifier=%s", authenticated_user.identifier)
    flash("Logged in successfully.", "success")
    return redirect(url_for("workout_controller.view_dashboard"))

@auth_blueprint.route("/logout", methods=["POST"])
def logout() -> str:
    """
    Logs the current user out and clears the session.
    """
    user_identifier = session.get("user_identifier")
    session.pop("user_identifier", None)
    session.pop("user_email", None)
    session.pop("user_display_name", None)
    logger.info("User logged out: user_identifier=%s", user_identifier)
    flash("Logged out successfully.", "success")
    return redirect(url_for("workout_controller.view_dashboard"))


@auth_blueprint.route("/profile", methods=["GET"])
@login_required
def profile() -> str:
    """
    Renders the authenticated user's profile and workout summary.
    """
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
