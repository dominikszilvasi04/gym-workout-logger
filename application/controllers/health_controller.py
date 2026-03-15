"""
Controller for system health and readiness probes.
"""
from flask import Blueprint, Response, jsonify

from application.database import database_manager

health_blueprint = Blueprint("health", __name__)


@health_blueprint.route("/health", methods=["GET"])
@health_blueprint.route("/health_check", methods=["GET"])
def health_check() -> tuple[Response, int]:
    """
    Performs a shallow health check of the application and database connectivity.
    """
    health_status = {"status": "healthy", "database": "disconnected"}

    try:
        if database_manager.database is not None:
            database_manager.database.command("ping")
            health_status["database"] = "connected"
            return jsonify(health_status), 200
    except Exception as error:
        health_status["status"] = "unhealthy"
        health_status["error"] = str(error)

    return jsonify(health_status), 503
