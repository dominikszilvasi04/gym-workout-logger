"""
Security utilities: CSRF protection, response hardening headers, and rate limiting.
"""

import secrets
from flask import Flask, request, session, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")


def get_or_create_csrf_token() -> str:
    """
    Retrieves the session CSRF token, creating one if absent.
    """
    csrf_token = session.get("csrf_token")
    if not csrf_token:
        csrf_token = secrets.token_urlsafe(32)
        session["csrf_token"] = csrf_token
    return csrf_token


def is_csrf_request_valid() -> bool:
    """
    Validates CSRF token from form field or request header.
    """
    session_csrf_token = session.get("csrf_token")
    if not session_csrf_token:
        return False

    supplied_csrf_token = request.headers.get("X-CSRF-Token") or request.form.get("csrf_token")
    if not supplied_csrf_token:
        return False

    return secrets.compare_digest(session_csrf_token, supplied_csrf_token)


def register_security_hooks(flask_application: Flask) -> None:
    """
    Registers security middleware hooks and template helpers.
    """

    @flask_application.context_processor
    def inject_csrf_token() -> dict[str, str]:
        return {"csrf_token": get_or_create_csrf_token()}

    @flask_application.before_request
    def enforce_csrf_token_on_state_changing_requests():
        if not flask_application.config.get("CSRF_PROTECTION_ENABLED", True):
            return None

        if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
            return None

        if request.endpoint == "static":
            return None

        if is_csrf_request_valid():
            return None

        if request.path.startswith("/api/"):
            return jsonify({"error": "CSRF validation failed."}), 400
        return "CSRF validation failed.", 400

    @flask_application.after_request
    def apply_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' https://cdn.jsdelivr.net; "
            "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
            "img-src 'self' data:; "
            "font-src 'self' https://cdn.jsdelivr.net; "
            "connect-src 'self'; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "frame-ancestors 'none'"
        )
        if request.is_secure:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response
