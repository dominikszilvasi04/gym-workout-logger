"""
Controller layer for handling exercise definition API requests.
"""
import logging
from flask import Blueprint, jsonify, Response
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