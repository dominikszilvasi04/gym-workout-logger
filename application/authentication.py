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
