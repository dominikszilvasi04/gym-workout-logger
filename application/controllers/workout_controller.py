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