"""
Controller for system health and readiness probes.
"""

from flask import Blueprint, Response, jsonify
from application.database import database_manager

health_blueprint = Blueprint("health", __name__)


@health_blueprint.route("/health", methods=["GET"])
def health_check() -> tuple[Response, int]:
    """
    Liveness probe that confirms the application process is running.
    """
    health_status = {"status": "healthy", "database": "disconnected"}
    try:
        if database_manager.database is not None:
            database_manager.database.command("ping")
            health_status["database"] = "connected"
    except Exception:
        health_status["database"] = "disconnected"
    return jsonify(health_status), 200


@health_blueprint.route("/health_check", methods=["GET"])
@health_blueprint.route("/ready", methods=["GET"])
def readiness_check() -> tuple[Response, int]:
    """
    Readiness probe that requires successful database connectivity.
    """
    health_status = {"status": "ready", "database": "disconnected"}
    try:
        if database_manager.database is not None:
            database_manager.database.command("ping")
            health_status["database"] = "connected"
            return jsonify(health_status), 200
    except Exception as error:
        health_status["status"] = "not_ready"
        health_status["error"] = str(error)
        return jsonify(health_status), 503

    health_status["status"] = "not_ready"
    return jsonify(health_status), 503
