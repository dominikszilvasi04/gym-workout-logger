"""
Controller layer for administrator-only management routes.
"""

import logging
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request, session, Response
from application.authentication import login_required, admin_required
from application.database import database_manager
from application.security import limiter
from application.services import application_user_service

admin_blueprint = Blueprint("admin_controller", __name__)
logger = logging.getLogger(__name__)


def _serialise_bson_document(document: dict) -> dict:
    serialised = dict(document)
    if "_id" in serialised:
        serialised["_id"] = str(serialised["_id"])
    return serialised


def _record_admin_audit_event(action: str, details: dict) -> None:
    if database_manager.database is None:
        return
    actor_identifier = session.get("user_identifier")
    actor_user = (
        application_user_service.retrieve_user(actor_identifier) if actor_identifier else None
    )
    database_manager.database["admin_audit_logs"].insert_one(
        {
            "timestamp": datetime.now(timezone.utc),
            "action": action,
            "actor_user_identifier": actor_identifier,
            "actor_email": actor_user.email if actor_user else None,
            "details": details,
        }
    )


@admin_blueprint.route("/api/admin/users", methods=["GET"])
@login_required
@admin_required
def list_users_endpoint() -> tuple[Response, int]:
    """
    Returns all users for admin management.
    """
    try:
        users = application_user_service.retrieve_all_users()
    except RuntimeError:
        logger.exception("User list request failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503

    payload = [
        {
            "_id": user.identifier,
            "email": user.email,
            "display_name": user.display_name,
            "auth_provider": user.auth_provider,
            "role": user.role,
            "created_at": user.created_at,
        }
        for user in users
    ]
    return jsonify(payload), 200


@admin_blueprint.route("/api/admin/users/<identifier>", methods=["DELETE"])
@login_required
@admin_required
@limiter.limit("30 per minute")
def delete_user_endpoint(identifier: str) -> tuple[Response, int]:
    """
    Hard-deletes one user and user-owned records.
    """
    try:
        deletion_summary = application_user_service.delete_user_and_related_data(identifier)
    except RuntimeError:
        logger.exception("User deletion failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503

    if not deletion_summary:
        return jsonify({"error": "User not found."}), 404

    if session.get("user_identifier") == identifier:
        session.clear()

    _record_admin_audit_event(
        action="delete_user",
        details={
            "target_user_identifier": identifier,
            **deletion_summary,
        },
    )

    return jsonify({"message": "User deleted.", **deletion_summary}), 200


@admin_blueprint.route("/api/admin/users", methods=["DELETE"])
@login_required
@admin_required
@limiter.limit("5 per minute")
def delete_all_users_endpoint() -> tuple[Response, int]:
    """
    Hard-deletes all users and user-owned records.
    """
    request_data = request.get_json(silent=True) or {}
    confirmation_text = str(request_data.get("confirmation_text", "")).strip()
    if confirmation_text != "DELETE ALL USERS":
        return jsonify({"error": "Confirmation text mismatch."}), 400

    try:
        deletion_summary = application_user_service.delete_all_users_and_related_data()
    except RuntimeError:
        logger.exception("Delete all users failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503

    _record_admin_audit_event(
        action="delete_all_users",
        details=deletion_summary,
    )

    session.clear()
    return jsonify({"message": "All users deleted.", **deletion_summary}), 200


@admin_blueprint.route("/api/admin/export", methods=["GET"])
@login_required
@admin_required
def export_data_endpoint() -> tuple[Response, int]:
    """
    Exports current user/workout/template data for backup before destructive operations.
    """
    if database_manager.database is None:
        return jsonify({"error": "Database unavailable."}), 503

    users = [
        _serialise_bson_document(document)
        for document in database_manager.database["users"].find({})
    ]
    workouts = [
        _serialise_bson_document(document)
        for document in database_manager.database["workouts"].find({})
    ]
    goals = [
        _serialise_bson_document(document)
        for document in database_manager.database["exercise_goals"].find({})
    ]
    templates = [
        _serialise_bson_document(document)
        for document in database_manager.database["workout_templates"].find({})
    ]

    _record_admin_audit_event(
        action="export_data",
        details={
            "users": len(users),
            "workouts": len(workouts),
            "exercise_goals": len(goals),
            "workout_templates": len(templates),
        },
    )

    return jsonify(
        {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "counts": {
                "users": len(users),
                "workouts": len(workouts),
                "exercise_goals": len(goals),
                "workout_templates": len(templates),
            },
            "users": users,
            "workouts": workouts,
            "exercise_goals": goals,
            "workout_templates": templates,
        }
    ), 200


@admin_blueprint.route("/api/admin/audit-logs", methods=["GET"])
@login_required
@admin_required
def list_admin_audit_logs_endpoint() -> tuple[Response, int]:
    """
    Returns recent admin audit log events.
    """
    if database_manager.database is None:
        return jsonify({"error": "Database unavailable."}), 503

    limit = min(max(request.args.get("limit", default=50, type=int), 1), 200)
    cursor = (
        database_manager.database["admin_audit_logs"].find({}).sort("timestamp", -1).limit(limit)
    )
    logs = [_serialise_bson_document(document) for document in cursor]
    return jsonify(logs), 200
