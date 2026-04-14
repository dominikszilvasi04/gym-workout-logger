"""
Repository layer for interacting with workout template documents.
"""

import logging
from typing import Any, Dict, List, Optional
from bson.objectid import ObjectId
from application.database import database_manager
from application.models.workout_template import WorkoutTemplateDocument

logger = logging.getLogger(__name__)


def _build_user_scope_filter(user_identifier: Optional[str]) -> Dict[str, Any]:
    """
    Builds a MongoDB filter for user scoping.
    """
    if user_identifier is not None:
        return {"user_identifier": user_identifier}
    return {"$or": [{"user_identifier": {"$exists": False}}, {"user_identifier": None}]}


class WorkoutTemplateRepository:
    """
    Handles all database operations for WorkoutTemplateDocument entities.
    """

    @property
    def collection(self) -> Any:
        """
        Retrieves the MongoDB collection for workout templates.
        """
        if database_manager.database is None:
            raise RuntimeError("Database client is not initialised.")
        return database_manager.database["workout_templates"]

    def create_workout_template(self, workout_template_document: WorkoutTemplateDocument) -> str:
        """
        Inserts a new workout template document into the database.
        """
        document_dictionary: Dict[str, Any] = workout_template_document.model_dump(
            by_alias=True, exclude={"identifier"}
        )
        insertion_result = self.collection.insert_one(document_dictionary)
        logger.info(
            "Workout template inserted with identifier=%s", str(insertion_result.inserted_id)
        )
        return str(insertion_result.inserted_id)

    def retrieve_workout_template_by_identifier(
        self,
        identifier: str,
        user_identifier: Optional[str] = None,
    ) -> Optional[WorkoutTemplateDocument]:
        """
        Retrieves a single workout template by identifier.
        """
        if not ObjectId.is_valid(identifier):
            return None
        query_filter: Dict[str, Any] = {
            "_id": ObjectId(identifier),
            **_build_user_scope_filter(user_identifier),
        }
        document = self.collection.find_one(query_filter)
        if document is None:
            return None
        document["_id"] = str(document["_id"])
        return WorkoutTemplateDocument(**document)

    def retrieve_all_workout_templates(
        self, user_identifier: Optional[str] = None
    ) -> List[WorkoutTemplateDocument]:
        """
        Retrieves all workout templates for the active user scope.
        """
        query_filter: Dict[str, Any] = _build_user_scope_filter(user_identifier)
        cursor = self.collection.find(query_filter).sort("template_name", 1)
        templates: List[WorkoutTemplateDocument] = []
        for document in cursor:
            document["_id"] = str(document["_id"])
            templates.append(WorkoutTemplateDocument(**document))
        return templates

    def delete_workout_template_by_identifier(
        self, identifier: str, user_identifier: Optional[str] = None
    ) -> bool:
        """
        Deletes a workout template for the active user scope.
        """
        if not ObjectId.is_valid(identifier):
            return False
        query_filter: Dict[str, Any] = {
            "_id": ObjectId(identifier),
            **_build_user_scope_filter(user_identifier),
        }
        deletion_result = self.collection.delete_one(query_filter)
        return deletion_result.deleted_count > 0

    def update_workout_template_by_identifier(
        self,
        identifier: str,
        updated_workout_template_document: WorkoutTemplateDocument,
        user_identifier: Optional[str] = None,
    ) -> bool:
        """
        Updates a workout template for the active user scope.
        """
        if not ObjectId.is_valid(identifier):
            return False
        query_filter: Dict[str, Any] = {
            "_id": ObjectId(identifier),
            **_build_user_scope_filter(user_identifier),
        }
        update_payload: Dict[str, Any] = {
            "$set": {
                "template_name": updated_workout_template_document.template_name,
                "target_muscle_groups": updated_workout_template_document.target_muscle_groups,
                "exercises": [
                    exercise.model_dump()
                    for exercise in updated_workout_template_document.exercises
                ],
            }
        }
        update_result = self.collection.update_one(query_filter, update_payload)
        return update_result.matched_count > 0

    def delete_templates_by_user_identifier(self, user_identifier: str) -> int:
        """
        Hard-deletes all templates that belong to a specific user.
        """
        if not user_identifier:
            return 0
        deletion_result = self.collection.delete_many({"user_identifier": user_identifier})
        return int(deletion_result.deleted_count)
