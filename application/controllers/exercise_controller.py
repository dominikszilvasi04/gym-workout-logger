"""
Controller layer for handling exercise definition API requests.
"""
import logging
from flask import Blueprint, current_app, jsonify, request, Response, session
from application.authentication import login_required
from application.services import application_exercise_definition_service

exercise_blueprint = Blueprint("exercise_controller", __name__)
logger = logging.getLogger(__name__)

@exercise_blueprint.route("/api/exercises", methods=["GET"])
def retrieve_exercises_endpoint() -> tuple[Response, int]:
    """
    API endpoint to retrieve all standardised exercises.
    
    Returns:
        A tuple containing the JSON response array and the HTTP status code.
    """
    logger.info("Exercise definitions requested.")
    standardised_exercises = application_exercise_definition_service.retrieve_all_standardised_exercises()
    json_payload = [exercise.model_dump(by_alias=True) for exercise in standardised_exercises]
    logger.debug("Returning %d exercise definitions.", len(json_payload))
    return jsonify(json_payload), 200

@exercise_blueprint.route("/api/exercises/requests", methods=["POST"])
@login_required
def request_new_exercise_endpoint() -> tuple[Response, int]:
    """
    Accepts user-submitted exercise requests and forwards them by email.
    """
    request_payload = request.get_json(silent=True) or {}
    requester_email = str(request_payload.get("requester_email", "")).strip() or str(session.get("user_email", "")).strip()
    requested_exercise_name = str(request_payload.get("exercise_name", "")).strip()
    requested_primary_muscle_group = str(request_payload.get("primary_muscle_group", "")).strip()
    request_notes = str(request_payload.get("notes", "")).strip() or str(request_payload.get("additional_notes", "")).strip()
    if not requester_email or "@" not in requester_email:
        return jsonify({"error": "A valid requester email is required."}), 400
    if not requested_exercise_name:
        return jsonify({"error": "Exercise name is required."}), 400
    if not requested_primary_muscle_group:
        return jsonify({"error": "Primary muscle group is required."}), 400
    try:
        application_exercise_definition_service.send_exercise_request_notification_email(
            requester_email=requester_email,
            requested_exercise_name=requested_exercise_name,
            requested_primary_muscle_group=requested_primary_muscle_group,
            request_notes=request_notes,
            application_configuration=current_app.config,
        )
    except Exception:
        logger.exception("Failed to send exercise request notification email.")
        return jsonify({"error": "Unable to submit exercise request right now."}), 503
    logger.info("Exercise request submitted for exercise_name=%s", requested_exercise_name)
    return jsonify({"message": "Exercise request sent successfully."}), 202