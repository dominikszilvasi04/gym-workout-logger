"""
Service layer for workout templates.
"""
import logging
from typing import List, Optional
from application.models.workout_template import WorkoutTemplateDocument
from application.repositories.workout_template_repository import WorkoutTemplateRepository

logger = logging.getLogger(__name__)

class WorkoutTemplateService:
    """
    Encapsulates business logic for workout template operations.
    """

    def __init__(self, workout_template_repository: WorkoutTemplateRepository) -> None:
        self.workout_template_repository = workout_template_repository

    def create_template(self, workout_template_document: WorkoutTemplateDocument) -> str:
        """
        Persists a new workout template.
        """
        logger.info("Creating workout template named=%s", workout_template_document.template_name)
        return self.workout_template_repository.create_workout_template(workout_template_document)

    def retrieve_template(self, identifier: str, user_identifier: Optional[str] = None) -> Optional[WorkoutTemplateDocument]:
        """
        Retrieves one template by identifier.
        """
        return self.workout_template_repository.retrieve_workout_template_by_identifier(
            identifier=identifier,
            user_identifier=user_identifier,
        )

    def retrieve_templates(self, user_identifier: Optional[str] = None) -> List[WorkoutTemplateDocument]:
        """
        Retrieves all templates for active user scope.
        """
        return self.workout_template_repository.retrieve_all_workout_templates(user_identifier=user_identifier)

    def delete_template(self, identifier: str, user_identifier: Optional[str] = None) -> bool:
        """
        Deletes one template for active user scope.
        """
        return self.workout_template_repository.delete_workout_template_by_identifier(
            identifier=identifier,
            user_identifier=user_identifier,
        )

    def update_template(
        self,
        identifier: str,
        workout_template_document: WorkoutTemplateDocument,
        user_identifier: Optional[str] = None,
    ) -> bool:
        """
        Updates one template for active user scope.
        """
        logger.info("Updating workout template identifier=%s", identifier)
        return self.workout_template_repository.update_workout_template_by_identifier(
            identifier=identifier,
            updated_workout_template_document=workout_template_document,
            user_identifier=user_identifier,
        )
