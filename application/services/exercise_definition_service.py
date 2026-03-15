"""
Service layer for handling standardised exercise definitions.
"""
import logging
from typing import List
from application.repositories.exercise_definition_repository import ExerciseDefinitionRepository
from application.models.exercise_definition import ExerciseDefinition

logger = logging.getLogger(__name__)


class ExerciseDefinitionService:
    """
    Encapsulates business logic for standard exercise definitions.
    """

    def __init__(self, exercise_definition_repository: ExerciseDefinitionRepository) -> None:
        """
        Initialises the service with a dedicated repository instance.
        
        Args:
            exercise_definition_repository: The injected data access object.
        """
        self.exercise_definition_repository = exercise_definition_repository

    def retrieve_all_standardised_exercises(self) -> List[ExerciseDefinition]:
        """
        Retrieves the complete master list of available exercises.
        
        Returns:
            A strictly typed list of ExerciseDefinition models.
        """
        exercises = self.exercise_definition_repository.retrieve_all_exercise_definitions()
        logger.debug("Retrieved %d standardised exercises from repository.", len(exercises))
        return exercises