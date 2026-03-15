"""
Controller layer for handling workout-related HTTP requests and web views.
"""
from flask import Blueprint, render_template, request, jsonify, Response
from application.services import application_workout_service
from application.models.workout import WorkoutDocument
from pydantic import ValidationError

workout_blueprint = Blueprint("workout_controller", __name__, template_folder="../templates")

@workout_blueprint.route("/", methods=["GET"])
def view_dashboard() -> str:
    """
    Renders the main dashboard view, displaying workout history.
    
    Returns:
        The rendered HTML string for the dashboard.
    """
    workout_history = application_workout_service.retrieve_workout_history()
    return render_template("dashboard.html", workouts=workout_history)

@workout_blueprint.route("/api/workouts", methods=["POST"])
def create_workout_endpoint() -> tuple[Response, int]:
    """
    API endpoint to record a new workout session.
    Expects a JSON payload matching the WorkoutDocument schema.
    
    Returns:
        A tuple containing the JSON response and the HTTP status code.
    """
    request_data = request.get_json()
    if not request_data:
        return jsonify({"error": "No JSON payload provided."}), 400
    try:
        workout_document = WorkoutDocument(**request_data)
    except ValidationError as validation_error:
        return jsonify({"error": "Data validation failed.", "details": validation_error.errors()}), 422
    inserted_identifier = application_workout_service.record_new_workout_session(workout_document=workout_document)
    return jsonify({"message": "Workout successfully recorded.", "identifier": inserted_identifier}), 201

@workout_blueprint.route("/log", methods=["GET"])
def view_workout_logging_form() -> str:
    """
    Renders the web form allowing users to input a new workout session.
    
    Returns:
        The rendered HTML string for the workout logging form.
    """
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
    deletion_successful = application_workout_service.remove_workout_session(identifier=identifier)
    if deletion_successful:
        return jsonify({"message": "Workout successfully deleted."}), 200
    else:
        return jsonify({"error": "Workout not found or invalid identifier provided."}), 404

@workout_blueprint.route("/edit/<identifier>", methods=["GET"])
def view_edit_workout_form(identifier: str) -> str:
    """
    Renders the workout form pre-populated with existing data for editing.
    """
    # We use our existing service to fetch the single workout
    # Note: For strictness, you'd usually have a 'retrieve_workout_by_id' service method.
    # For now, we'll find it in the history list for simplicity.
    history = application_workout_service.retrieve_workout_history()
    workout_to_edit = next((w for w in history if w.identifier == identifier), None)
    
    if not workout_to_edit:
        return "Workout not found", 404
        
    return render_template("edit_workout.html", workout=workout_to_edit)

@workout_blueprint.route("/api/workouts/<identifier>", methods=["PUT"])
def update_workout_endpoint(identifier: str) -> tuple[Response, int]:
    """
    API endpoint to update an existing workout session.
    """
    request_data = request.get_json()
    try:
        workout_document = WorkoutDocument(**request_data)
        success = application_workout_service.modify_workout_session(identifier, workout_document)
        if success:
            return jsonify({"message": "Workout updated successfully."}), 200
        return jsonify({"error": "Update failed."}), 404
    except ValidationError as error:
        return jsonify({"error": str(error)}), 422