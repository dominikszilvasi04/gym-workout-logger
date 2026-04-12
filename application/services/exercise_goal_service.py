"""
Service layer for user exercise goals.
"""
import logging
from typing import Any, Optional
from application.models.exercise_goal import ExerciseGoalDocument
from application.models.workout import WorkoutDocument
from application.repositories.exercise_goal_repository import ExerciseGoalRepository
from application.services.workout_service import WorkoutService

logger = logging.getLogger(__name__)


class ExerciseGoalService:
    """
    Encapsulates business logic for goal management and progress tracking.
    """

    def __init__(self, exercise_goal_repository: ExerciseGoalRepository, workout_service: WorkoutService) -> None:
        self.exercise_goal_repository = exercise_goal_repository
        self.workout_service = workout_service

    def create_goal(self, goal_document: ExerciseGoalDocument) -> str:
        return self.exercise_goal_repository.create_goal(goal_document)

    def retrieve_goals(self, user_identifier: Optional[str] = None) -> list[ExerciseGoalDocument]:
        return self.exercise_goal_repository.retrieve_all_goals(user_identifier=user_identifier)

    def retrieve_goal(self, identifier: str, user_identifier: Optional[str] = None) -> Optional[ExerciseGoalDocument]:
        return self.exercise_goal_repository.retrieve_goal_by_identifier(identifier=identifier, user_identifier=user_identifier)

    def update_goal(self, identifier: str, goal_document: ExerciseGoalDocument, user_identifier: Optional[str] = None) -> bool:
        return self.exercise_goal_repository.update_goal_by_identifier(
            identifier=identifier,
            updated_goal_document=goal_document,
            user_identifier=user_identifier,
        )

    def delete_goal(self, identifier: str, user_identifier: Optional[str] = None) -> bool:
        return self.exercise_goal_repository.delete_goal_by_identifier(identifier=identifier, user_identifier=user_identifier)

    def build_goal_progress_payload(self, user_identifier: Optional[str]) -> list[dict[str, Any]]:
        goals = self.retrieve_goals(user_identifier=user_identifier)
        workouts = self.workout_service.retrieve_workout_history(user_identifier=user_identifier)
        return [self._build_goal_progress_item(goal, workouts) for goal in goals]

    def _build_goal_progress_item(self, goal: ExerciseGoalDocument, workouts: list[WorkoutDocument]) -> dict[str, Any]:
        target_estimated_one_rep_maximum = self.workout_service.calculate_estimated_one_repetition_maximum(
            weight_in_kilograms=goal.target_weight_in_kilograms,
            repetitions=goal.target_repetitions,
        )

        current_best_estimated_one_rep_maximum = 0.0
        for workout in workouts:
            for exercise in workout.exercises:
                same_definition = (
                    bool(goal.exercise_definition_identifier)
                    and (exercise.exercise_definition_identifier or "").strip() == (goal.exercise_definition_identifier or "").strip()
                )
                same_name = (exercise.exercise_name or "").strip().lower() == goal.exercise_name.strip().lower()
                if not same_definition and not same_name:
                    continue
                for workout_set in exercise.sets:
                    estimated_one_rep_maximum = self.workout_service.calculate_estimated_one_repetition_maximum(
                        weight_in_kilograms=workout_set.weight_in_kilograms,
                        repetitions=workout_set.repetitions,
                    )
                    if estimated_one_rep_maximum > current_best_estimated_one_rep_maximum:
                        current_best_estimated_one_rep_maximum = estimated_one_rep_maximum

        progress_percentage = 0.0
        if target_estimated_one_rep_maximum > 0:
            progress_percentage = round((current_best_estimated_one_rep_maximum / target_estimated_one_rep_maximum) * 100.0, 2)

        is_achieved = current_best_estimated_one_rep_maximum >= target_estimated_one_rep_maximum and target_estimated_one_rep_maximum > 0

        return {
            "_id": goal.identifier,
            "exercise_name": goal.exercise_name,
            "exercise_definition_identifier": goal.exercise_definition_identifier,
            "target_weight_in_kilograms": goal.target_weight_in_kilograms,
            "target_repetitions": goal.target_repetitions,
            "target_date": goal.target_date.isoformat() if goal.target_date else None,
            "target_estimated_one_rep_maximum": target_estimated_one_rep_maximum,
            "current_best_estimated_one_rep_maximum": round(current_best_estimated_one_rep_maximum, 2),
            "progress_percentage": min(progress_percentage, 999.0),
            "is_achieved": is_achieved,
        }
