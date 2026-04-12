"""
Authentication helpers and route protection decorators.
"""
from functools import wraps
from typing import Callable, TypeVar, cast
from flask import session, request, jsonify, redirect, url_for, flash

ViewFunction = TypeVar("ViewFunction", bound=Callable[..., object])


def login_required(view_function: ViewFunction) -> ViewFunction:
    """
    Ensures a valid authenticated user exists in server-side session state.

    For API requests, returns 401 JSON.
    For page requests, redirects to login with a flash message.
    """
    @wraps(view_function)
    def wrapped_view(*args: object, **kwargs: object) -> object:
        if session.get("user_identifier"):
            return view_function(*args, **kwargs)

        if request.path.startswith("/api/"):
            return jsonify({"error": "Authentication required."}), 401

        flash("Please log in to access this page.", "warning")
        return redirect(url_for("auth_controller.login"))

    return cast(ViewFunction, wrapped_view)


def admin_required(view_function: ViewFunction) -> ViewFunction:
    """
    Ensures the current session is authenticated and belongs to an admin user.

    For API requests, returns 401/403 JSON.
    For page requests, redirects with a flash message.
    """
    @wraps(view_function)
    def wrapped_view(*args: object, **kwargs: object) -> object:
        user_identifier = session.get("user_identifier")
        if not user_identifier:
            if request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required."}), 401
            flash("Please log in to access this page.", "warning")
            return redirect(url_for("auth_controller.login"))

        from application.services import application_user_service

        user = application_user_service.retrieve_user(user_identifier)
        if application_user_service.is_admin_user(user):
            return view_function(*args, **kwargs)

        if request.path.startswith("/api/"):
            return jsonify({"error": "Administrator access is required."}), 403

        flash("You do not have permission to access this page.", "danger")
        return redirect(url_for("workout_controller.view_dashboard"))

    return cast(ViewFunction, wrapped_view)
