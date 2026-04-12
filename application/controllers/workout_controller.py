"""
Controller layer for handling workout-related HTTP requests and web views.
"""
import logging
from datetime import datetime
from pathlib import Path
from flask import Blueprint, render_template, request, jsonify, Response, session, current_app
from flask import send_from_directory
from application.authentication import login_required
from application.security import limiter
from application.services import application_workout_service, application_workout_template_service
from application.services import application_exercise_definition_service, application_user_service
from application.services import application_exercise_goal_service
from application.models.workout import WorkoutDocument
from application.models.workout_template import WorkoutTemplateDocument
from application.models.exercise_goal import ExerciseGoalDocument
from pydantic import ValidationError

workout_blueprint = Blueprint("workout_controller", __name__, template_folder="../templates")
logger = logging.getLogger(__name__)


def get_authenticated_user_identifier() -> str | None:
    """
    Retrieves the logged-in user's identifier from session state.
    """
    return session.get("user_identifier")


def render_react_application_if_available() -> Response | None:
    frontend_dist_directory = current_app.config.get("FRONTEND_DIST_DIRECTORY")
    if not frontend_dist_directory:
        return None
    frontend_index_file = Path(frontend_dist_directory) / "index.html"
    if not frontend_index_file.exists():
        return None
    return send_from_directory(frontend_dist_directory, "index.html")

@workout_blueprint.route("/", methods=["GET"])
def view_dashboard() -> tuple[str, int] | str | Response:
    """
    Renders the main dashboard view, displaying workout history.
    
    Returns:
        The rendered HTML string for the dashboard.
    """
    react_application_response = render_react_application_if_available()
    if react_application_response:
        return react_application_response

    logger.info("Dashboard requested.")
    user_identifier = get_authenticated_user_identifier()
    workout_templates = []
    try:
        workout_history = application_workout_service.retrieve_workout_history(user_identifier=user_identifier)
        if user_identifier:
            workout_templates = application_workout_template_service.retrieve_templates(user_identifier=user_identifier)
    except RuntimeError:
        logger.exception("Dashboard request failed because the database client is not initialised.")
        return render_template("dashboard.html", workouts=[], workout_templates=[]), 503
    logger.debug("Dashboard rendering with %d workouts.", len(workout_history))
    return render_template("dashboard.html", workouts=workout_history, workout_templates=workout_templates)


@workout_blueprint.route("/api/dashboard/analytics", methods=["GET"])
@login_required
def retrieve_dashboard_analytics_endpoint() -> tuple[Response, int]:
    """
    Returns real dashboard analytics data for charts and summary cards.
    """
    user_identifier = get_authenticated_user_identifier()
    requested_range_days = request.args.get("range_days", default=None, type=int)
    selected_exercise_name = request.args.get("exercise_name", default=None, type=str)
    try:
        analytics_payload = application_workout_service.build_dashboard_analytics(
            user_identifier=user_identifier,
            range_days=requested_range_days,
            exercise_name=selected_exercise_name
        )
    except RuntimeError:
        logger.exception("Dashboard analytics failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503
    logger.debug("Dashboard analytics generated for user_identifier=%s", user_identifier)
    return jsonify(analytics_payload), 200


@workout_blueprint.route("/api/dashboard/init", methods=["GET"])
@login_required
def retrieve_dashboard_initial_data_endpoint() -> tuple[Response, int]:
    user_identifier = get_authenticated_user_identifier()
    try:
        user = application_user_service.retrieve_user(user_identifier)
        recent_workouts = application_workout_service.retrieve_recent_workouts(
            user_identifier=user_identifier,
            limit=12,
        )
        templates = application_workout_template_service.retrieve_templates(user_identifier=user_identifier)
        exercises = application_exercise_definition_service.retrieve_available_exercises()
        goals = application_exercise_goal_service.build_goal_progress_payload(user_identifier=user_identifier)
    except RuntimeError:
        logger.exception("Dashboard initial data request failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503

    payload = {
        "user": user.model_dump(by_alias=True, exclude={"password_hash"}) if user else None,
        "recent_workouts": [workout.model_dump(by_alias=True) for workout in recent_workouts],
        "templates": [template.model_dump(by_alias=True) for template in templates],
        "exercises": [exercise.model_dump(by_alias=True) for exercise in exercises],
        "goals": goals,
    }
    return jsonify(payload), 200


@workout_blueprint.route("/api/workouts", methods=["GET"])
@login_required
def retrieve_workouts_endpoint() -> tuple[Response, int]:
    user_identifier = get_authenticated_user_identifier()
    page_number = max(request.args.get("page", default=1, type=int), 1)
    page_size = min(max(request.args.get("limit", default=20, type=int), 1), 100)
    sort_field = (request.args.get("sort", default="date_of_workout", type=str) or "date_of_workout").strip()
    sort_order = (request.args.get("order", default="desc", type=str) or "desc").strip().lower()
    requested_exercise_name = (request.args.get("exercise_name", default="", type=str) or "").strip().lower()
    requested_target_muscle_group = (request.args.get("target_muscle_group", default="", type=str) or "").strip().lower()
    requested_session_tag = (request.args.get("session_tag", default="", type=str) or "").strip().lower()
    start_date_text = (request.args.get("start_date", default="", type=str) or "").strip()
    end_date_text = (request.args.get("end_date", default="", type=str) or "").strip()

    start_date = None
    if start_date_text:
        try:
            start_date = datetime.strptime(start_date_text, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid start_date format. Expected YYYY-MM-DD."}), 400

    end_date = None
    if end_date_text:
        try:
            end_date = datetime.strptime(end_date_text, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid end_date format. Expected YYYY-MM-DD."}), 400

    if start_date and end_date and start_date > end_date:
        return jsonify({"error": "start_date cannot be greater than end_date."}), 400

    try:
        workouts = application_workout_service.retrieve_workout_history(user_identifier=user_identifier)
    except RuntimeError:
        logger.exception("Workout list request failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503

    reverse_sort = sort_order != "asc"
    if sort_field == "date_of_workout":
        workouts = sorted(
            workouts,
            key=lambda workout: application_workout_service.normalise_datetime_to_utc(workout.date_of_workout),
            reverse=reverse_sort,
        )

    if requested_exercise_name:
        workouts = [
            workout
            for workout in workouts
            if any(
                requested_exercise_name in (exercise.exercise_name or "").strip().lower()
                for exercise in workout.exercises
            )
        ]

    if requested_target_muscle_group:
        workouts = [
            workout
            for workout in workouts
            if any(
                requested_target_muscle_group in (muscle_group or "").strip().lower()
                for muscle_group in workout.target_muscle_groups
            )
        ]

    if requested_session_tag:
        workouts = [
            workout
            for workout in workouts
            if any(
                requested_session_tag in (session_tag or "").strip().lower()
                for session_tag in (workout.session_tags or [])
            )
        ]

    if start_date or end_date:
        filtered_workouts = []
        for workout in workouts:
            workout_date = application_workout_service.normalise_datetime_to_utc(workout.date_of_workout).date()
            if start_date and workout_date < start_date:
                continue
            if end_date and workout_date > end_date:
                continue
            filtered_workouts.append(workout)
        workouts = filtered_workouts

    total_items = len(workouts)
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 0
    start_index = (page_number - 1) * page_size
    end_index = start_index + page_size
    page_items = workouts[start_index:end_index]

    return jsonify(
        {
            "workouts": [workout.model_dump(by_alias=True) for workout in page_items],
            "total": total_items,
            "total_pages": total_pages,
            "page": page_number,
            "limit": page_size,
        }
    ), 200

@workout_blueprint.route("/workouts/<identifier>", methods=["GET"])
@login_required
def view_workout_detail(identifier: str) -> str | tuple[str, int] | Response:
    """
    Renders a dedicated detail page for a single workout session.

    Args:
        identifier: The unique database identifier for the workout.

    Returns:
        The rendered HTML string for the detail page, or a 404 response.
    """
    react_application_response = render_react_application_if_available()
    if react_application_response:
        return react_application_response

    logger.info("Workout detail requested for identifier=%s", identifier)
    user_identifier = get_authenticated_user_identifier()
    selected_workout = application_workout_service.retrieve_specific_workout(
        identifier=identifier,
        user_identifier=user_identifier
    )
    if not selected_workout:
        logger.warning("Workout detail not found for identifier=%s", identifier)
        return "Workout not found", 404
    return render_template("workout_detail.html", workout=selected_workout)

@workout_blueprint.route("/api/workouts", methods=["POST"])
@login_required
@limiter.limit("120 per minute")
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

    user_identifier = get_authenticated_user_identifier()
    if user_identifier is not None:
        request_data["user_identifier"] = user_identifier

    try:
        workout_document = WorkoutDocument(**request_data)
    except ValidationError as validation_error:
        logger.warning("Create workout request validation failed.")
        return jsonify({"error": "Data validation failed.", "details": validation_error.errors()}), 422
    inserted_identifier = application_workout_service.record_new_workout_session(workout_document=workout_document)
    logger.info("Workout created successfully with identifier=%s", inserted_identifier)
    return jsonify({"message": "Workout successfully recorded.", "identifier": inserted_identifier}), 201

@workout_blueprint.route("/log", methods=["GET"])
@login_required
def view_workout_logging_form() -> str | Response:
    """
    Renders the web form allowing users to input a new workout session.
    
    Returns:
        The rendered HTML string for the workout logging form.
    """
    react_application_response = render_react_application_if_available()
    if react_application_response:
        return react_application_response

    logger.debug("Workout logging form requested.")
    log_source = (request.args.get("source", default="", type=str) or "").strip().lower()
    should_prefill_from_last = log_source == "last"
    return render_template("log_workout.html", should_prefill_from_last=should_prefill_from_last)

@workout_blueprint.route("/api/workouts/last", methods=["GET"])
@login_required
def retrieve_last_workout_endpoint() -> tuple[Response, int]:
    """
    Returns the most recently logged workout for quick repeat flows.
    """
    user_identifier = get_authenticated_user_identifier()
    try:
        most_recent_workout = application_workout_service.retrieve_most_recent_workout(user_identifier=user_identifier)
    except RuntimeError:
        logger.exception("Last workout request failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503
    if most_recent_workout is None:
        return jsonify({"error": "No previous workout found."}), 404
    return jsonify(most_recent_workout.model_dump(by_alias=True)), 200

@workout_blueprint.route("/api/workouts/last-used-values", methods=["GET"])
@login_required
def retrieve_last_used_values_endpoint() -> tuple[Response, int]:
    """
    Returns last-used set values keyed by exercise definition identifier.
    """
    user_identifier = get_authenticated_user_identifier()
    try:
        last_used_values = application_workout_service.build_last_used_values_map(user_identifier=user_identifier)
    except RuntimeError:
        logger.exception("Last-used values request failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503
    return jsonify({"last_used_values": last_used_values}), 200


@workout_blueprint.route("/api/workouts/<identifier>", methods=["GET"])
@login_required
def retrieve_workout_detail_endpoint(identifier: str) -> tuple[Response, int]:
    """
    API endpoint to retrieve a single workout session with full details.
    
    Args:
        identifier: The unique database identifier for the workout.
        
    Returns:
        A tuple containing the JSON response with the workout data and the HTTP status code.
    """
    logger.info("Workout detail request received for identifier=%s", identifier)
    user_identifier = get_authenticated_user_identifier()
    try:
        workout = application_workout_service.retrieve_specific_workout(
            identifier=identifier,
            user_identifier=user_identifier
        )
    except RuntimeError:
        logger.exception("Workout detail request failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503
    if not workout:
        logger.warning("Workout detail not found for identifier=%s", identifier)
        return jsonify({"error": "Workout not found."}), 404
    return jsonify(workout.model_dump(by_alias=True)), 200


@workout_blueprint.route("/api/workout-templates", methods=["GET"])
@login_required
def retrieve_workout_templates_endpoint() -> tuple[Response, int]:
    """
    Returns all saved workout templates for the authenticated user.
    """
    user_identifier = get_authenticated_user_identifier()
    try:
        templates = application_workout_template_service.retrieve_templates(user_identifier=user_identifier)
    except RuntimeError:
        logger.exception("Template list request failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503
    return jsonify([template.model_dump(by_alias=True) for template in templates]), 200


@workout_blueprint.route("/api/workout-templates/<identifier>", methods=["GET"])
@login_required
def retrieve_workout_template_by_identifier_endpoint(identifier: str) -> tuple[Response, int]:
    """
    Returns one saved workout template for the authenticated user.
    """
    user_identifier = get_authenticated_user_identifier()
    try:
        template = application_workout_template_service.retrieve_template(identifier=identifier, user_identifier=user_identifier)
    except RuntimeError:
        logger.exception("Template detail request failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503
    if template is None:
        return jsonify({"error": "Template not found."}), 404
    return jsonify(template.model_dump(by_alias=True)), 200


@workout_blueprint.route("/api/goals", methods=["GET"])
@login_required
def retrieve_exercise_goals_endpoint() -> tuple[Response, int]:
    """
    Returns all user exercise goals with computed progress values.
    """
    user_identifier = get_authenticated_user_identifier()
    try:
        goals_payload = application_exercise_goal_service.build_goal_progress_payload(user_identifier=user_identifier)
    except RuntimeError:
        logger.exception("Goal list request failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503
    return jsonify(goals_payload), 200


@workout_blueprint.route("/api/goals", methods=["POST"])
@login_required
@limiter.limit("120 per minute")
def create_exercise_goal_endpoint() -> tuple[Response, int]:
    """
    Creates a new exercise goal for the authenticated user.
    """
    request_data = request.get_json(silent=True)
    if request_data is None or not isinstance(request_data, dict):
        return jsonify({"error": "A valid JSON payload is required."}), 400

    user_identifier = get_authenticated_user_identifier()
    if user_identifier is not None:
        request_data["user_identifier"] = user_identifier

    try:
        goal_document = ExerciseGoalDocument(**request_data)
    except ValidationError as validation_error:
        return jsonify({"error": "Validation failed", "details": validation_error.errors()}), 422

    try:
        inserted_identifier = application_exercise_goal_service.create_goal(goal_document)
    except RuntimeError:
        logger.exception("Goal creation failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503
    return jsonify({"message": "Goal created.", "identifier": inserted_identifier}), 201


@workout_blueprint.route("/api/goals/<identifier>", methods=["PUT"])
@login_required
@limiter.limit("120 per minute")
def update_exercise_goal_endpoint(identifier: str) -> tuple[Response, int]:
    """
    Updates one exercise goal for the authenticated user.
    """
    request_data = request.get_json(silent=True)
    if request_data is None or not isinstance(request_data, dict):
        return jsonify({"error": "A valid JSON payload is required."}), 400

    user_identifier = get_authenticated_user_identifier()
    if user_identifier is not None:
        request_data["user_identifier"] = user_identifier

    try:
        goal_document = ExerciseGoalDocument(**request_data)
    except ValidationError as validation_error:
        return jsonify({"error": "Validation failed", "details": validation_error.errors()}), 422

    try:
        updated = application_exercise_goal_service.update_goal(
            identifier=identifier,
            goal_document=goal_document,
            user_identifier=user_identifier,
        )
    except RuntimeError:
        logger.exception("Goal update failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503

    if not updated:
        return jsonify({"error": "Goal not found."}), 404
    return jsonify({"message": "Goal updated."}), 200


@workout_blueprint.route("/api/goals/<identifier>", methods=["DELETE"])
@login_required
@limiter.limit("120 per minute")
def delete_exercise_goal_endpoint(identifier: str) -> tuple[Response, int]:
    """
    Deletes one exercise goal for the authenticated user.
    """
    user_identifier = get_authenticated_user_identifier()
    try:
        deleted = application_exercise_goal_service.delete_goal(identifier=identifier, user_identifier=user_identifier)
    except RuntimeError:
        logger.exception("Goal deletion failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503

    if not deleted:
        return jsonify({"error": "Goal not found."}), 404
    return jsonify({"message": "Goal deleted."}), 200


@workout_blueprint.route("/api/workout-templates", methods=["POST"])
@login_required
@limiter.limit("120 per minute")
def create_workout_template_endpoint() -> tuple[Response, int]:
    """
    Creates a new workout template for the authenticated user.
    """
    request_data = request.get_json(silent=True)
    if request_data is None or not isinstance(request_data, dict):
        return jsonify({"error": "A valid JSON payload is required."}), 400

    user_identifier = get_authenticated_user_identifier()
    if user_identifier is not None:
        request_data["user_identifier"] = user_identifier

    try:
        template_document = WorkoutTemplateDocument(**request_data)
    except ValidationError as validation_error:
        return jsonify({"error": "Validation failed", "details": validation_error.errors()}), 422

    try:
        inserted_identifier = application_workout_template_service.create_template(template_document)
    except RuntimeError:
        logger.exception("Template creation failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503
    return jsonify({"message": "Workout template created.", "identifier": inserted_identifier}), 201


@workout_blueprint.route("/api/workout-templates/<identifier>", methods=["DELETE"])
@login_required
@limiter.limit("120 per minute")
def delete_workout_template_endpoint(identifier: str) -> tuple[Response, int]:
    """
    Deletes a saved workout template for the authenticated user.
    """
    user_identifier = get_authenticated_user_identifier()
    try:
        deleted = application_workout_template_service.delete_template(identifier=identifier, user_identifier=user_identifier)
    except RuntimeError:
        logger.exception("Template deletion failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503
    if not deleted:
        return jsonify({"error": "Template not found."}), 404
    return jsonify({"message": "Workout template deleted."}), 200


@workout_blueprint.route("/api/workout-templates/<identifier>", methods=["PUT"])
@login_required
@limiter.limit("120 per minute")
def update_workout_template_endpoint(identifier: str) -> tuple[Response, int]:
    """
    Updates a saved workout template for the authenticated user.
    """
    request_data = request.get_json(silent=True)
    if request_data is None or not isinstance(request_data, dict):
        return jsonify({"error": "A valid JSON payload is required."}), 400
    user_identifier = get_authenticated_user_identifier()
    if user_identifier is not None:
        request_data["user_identifier"] = user_identifier
    try:
        template_document = WorkoutTemplateDocument(**request_data)
    except ValidationError as validation_error:
        return jsonify({"error": "Validation failed", "details": validation_error.errors()}), 422
    try:
        updated = application_workout_template_service.update_template(
            identifier=identifier,
            workout_template_document=template_document,
            user_identifier=user_identifier,
        )
    except RuntimeError:
        logger.exception("Template update failed because the database client is not initialised.")
        return jsonify({"error": "Database unavailable."}), 503
    if not updated:
        return jsonify({"error": "Template not found."}), 404
    return jsonify({"message": "Workout template updated."}), 200

@workout_blueprint.route("/api/workouts/<identifier>", methods=["DELETE"])
@login_required
@limiter.limit("120 per minute")
def delete_workout_endpoint(identifier: str) -> tuple[Response, int]:
    """
    API endpoint to permanently delete a workout session.
    
    Args:
        identifier: The unique database identifier passed via the URL path.
        
    Returns:
        A tuple containing the JSON response and the HTTP status code.
    """
    logger.info("Delete workout request received for identifier=%s", identifier)
    user_identifier = get_authenticated_user_identifier()
    deletion_successful = application_workout_service.remove_workout_session(
        identifier=identifier,
        user_identifier=user_identifier
    )
    if deletion_successful:
        logger.info("Workout deleted successfully for identifier=%s", identifier)
        return jsonify({"message": "Workout successfully deleted."}), 200
    else:
        logger.warning("Delete failed. Workout not found or identifier invalid: %s", identifier)
        return jsonify({"error": "Workout not found or invalid identifier provided."}), 404

@workout_blueprint.route("/edit/<identifier>", methods=["GET"])
@login_required
def view_edit_workout_form(identifier: str) -> str | Response:
    """
    Renders the workout form pre-populated with existing data.
    """
    react_application_response = render_react_application_if_available()
    if react_application_response:
        return react_application_response

    logger.info("Edit workout form requested for identifier=%s", identifier)
    user_identifier = get_authenticated_user_identifier()
    workout_to_edit = application_workout_service.retrieve_specific_workout(
        identifier=identifier,
        user_identifier=user_identifier
    )
    if not workout_to_edit:
        logger.warning("Edit requested for missing workout identifier=%s", identifier)
        return "Workout not found", 404
    return render_template("edit_workout.html", workout=workout_to_edit)

@workout_blueprint.route("/api/workouts/<identifier>", methods=["PUT"])
@login_required
@limiter.limit("120 per minute")
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
        user_identifier = get_authenticated_user_identifier()
        success = application_workout_service.modify_workout_session(
            identifier,
            workout_document,
            user_identifier=user_identifier
        )
        if success:
            logger.info("Workout updated successfully for identifier=%s", identifier)
            return jsonify({"message": "Workout updated successfully."}), 200
        logger.warning("Workout update failed: workout not found for identifier=%s", identifier)
        return jsonify({"error": "Workout session not found."}), 404
    except ValidationError as error:
        logger.warning("Workout update validation failed for identifier=%s", identifier)
        return jsonify({"error": "Validation failed", "details": error.errors()}), 422