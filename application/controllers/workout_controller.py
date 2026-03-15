"""
Controller layer for handling workout-related HTTP requests and web views.
"""
import logging
from flask import Blueprint, render_template, request, jsonify, Response
from application.services import application_workout_service
from application.models.workout import WorkoutDocument
from pydantic import ValidationError

workout_blueprint = Blueprint("workout_controller", __name__, template_folder="../templates")
logger = logging.getLogger(__name__)

@workout_blueprint.route("/", methods=["GET"])
def view_dashboard() -> str:
    """
    Renders the main dashboard view, displaying workout history.
    
    Returns:
        The rendered HTML string for the dashboard.
    """
    logger.info("Dashboard requested.")
    workout_history = application_workout_service.retrieve_workout_history()
    logger.debug("Dashboard rendering with %d workouts.", len(workout_history))
    return render_template("dashboard.html", workouts=workout_history)

@workout_blueprint.route("/workouts/<identifier>", methods=["GET"])
def view_workout_detail(identifier: str) -> str | tuple[str, int]:
    """
    Renders a dedicated detail page for a single workout session.

    Args:
        identifier: The unique database identifier for the workout.

    Returns:
        The rendered HTML string for the detail page, or a 404 response.
    """
    logger.info("Workout detail requested for identifier=%s", identifier)
    selected_workout = application_workout_service.retrieve_specific_workout(identifier=identifier)
    if not selected_workout:
        logger.warning("Workout detail not found for identifier=%s", identifier)
        return "Workout not found", 404
    return render_template("workout_detail.html", workout=selected_workout)

@workout_blueprint.route("/api/workouts", methods=["POST"])
def create_workout_endpoint() -> tuple[Response, int]:
    """
    API endpoint to record a new workout session.
    Expects a JSON payload matching the WorkoutDocument schema.
    
    Returns:
        A tuple containing the JSON response and the HTTP status code.
    """
    logger.info("Create workout request received.")
    request_data = request.get_json()
    if not request_data:
        logger.warning("Create workout request rejected: missing JSON payload.")
        return jsonify({"error": "No JSON payload provided."}), 400
    try:
        workout_document = WorkoutDocument(**request_data)
    except ValidationError as validation_error:
        logger.warning("Create workout request validation failed.")
        return jsonify({"error": "Data validation failed.", "details": validation_error.errors()}), 422
    inserted_identifier = application_workout_service.record_new_workout_session(workout_document=workout_document)
    logger.info("Workout created successfully with identifier=%s", inserted_identifier)
    return jsonify({"message": "Workout successfully recorded.", "identifier": inserted_identifier}), 201

@workout_blueprint.route("/log", methods=["GET"])
def view_workout_logging_form() -> str:
    """
    Renders the web form allowing users to input a new workout session.
    
    Returns:
        The rendered HTML string for the workout logging form.
    """
    logger.debug("Workout logging form requested.")
    return render_template("log_workout.html")

@workout_blueprint.route("/api/workouts/<identifier>", methods=["DELETE"])
def delete_workout_endpoint(identifier: str) -> tuple[Response, int]:
    """
    API endpoint to permanently delete a workout session.
    
    Args:
        identifier: The unique database identifier passed via the URL path.
        
    Returns:
        A tuple containing the JSON response and the HTTP status code.
    """
    logger.info("Delete workout request received for identifier=%s", identifier)
    deletion_successful = application_workout_service.remove_workout_session(identifier=identifier)
    if deletion_successful:
        logger.info("Workout deleted successfully for identifier=%s", identifier)
        return jsonify({"message": "Workout successfully deleted."}), 200
    else:
        logger.warning("Delete failed. Workout not found or identifier invalid: %s", identifier)
        return jsonify({"error": "Workout not found or invalid identifier provided."}), 404

@workout_blueprint.route("/edit/<identifier>", methods=["GET"])
def view_edit_workout_form(identifier: str) -> str:
    """
    Renders the workout form pre-populated with existing data.
    """
    logger.info("Edit workout form requested for identifier=%s", identifier)
    workout_to_edit = application_workout_service.retrieve_specific_workout(identifier=identifier)
    if not workout_to_edit:
        logger.warning("Edit requested for missing workout identifier=%s", identifier)
        return "Workout not found", 404
    return render_template("edit_workout.html", workout=workout_to_edit)

@workout_blueprint.route("/api/workouts/<identifier>", methods=["PUT"])
def update_workout_endpoint(identifier: str) -> tuple[Response, int]:
    """
    API endpoint to update an existing workout session with strict validation.
    """
    logger.info("Update workout request received for identifier=%s", identifier)
    request_data = request.get_json()
    if request_data is None or not isinstance(request_data, dict):
        logger.warning("Update workout rejected for identifier=%s due to invalid JSON payload.", identifier)
        return jsonify({"error": "A valid JSON payload is required."}), 400
    try:
        workout_document = WorkoutDocument(**request_data)
        success = application_workout_service.modify_workout_session(identifier, workout_document)
        if success:
            logger.info("Workout updated successfully for identifier=%s", identifier)
            return jsonify({"message": "Workout updated successfully."}), 200
        logger.warning("Workout update failed: workout not found for identifier=%s", identifier)
        return jsonify({"error": "Workout session not found."}), 404
    except ValidationError as error:
        logger.warning("Workout update validation failed for identifier=%s", identifier)
        return jsonify({"error": "Validation failed", "details": error.errors()}), 422