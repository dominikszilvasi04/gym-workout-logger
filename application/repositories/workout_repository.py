"""
Repository layer for interacting with the workouts MongoDB collection.
"""

import logging
from typing import List, Optional, Dict, Any
from bson.objectid import ObjectId
from application.database import database_manager
from application.models.workout import WorkoutDocument

logger = logging.getLogger(__name__)


def _build_user_scope_filter(user_identifier: Optional[str]) -> Dict[str, Any]:
    """
    Builds a MongoDB filter for user scoping.

    - Authenticated users: only their own workouts.
    - Unauthenticated users: only legacy anonymous workouts.
    """
    if user_identifier is not None:
        return {"user_identifier": user_identifier}
    return {"$or": [{"user_identifier": {"$exists": False}}, {"user_identifier": None}]}


class WorkoutRepository:
    """
    Handles all database operations for WorkoutDocument entities.
    """

    @property
    def collection(self) -> Any:
        """
        Retrieves the MongoDB collection for workouts.

        Raises:
            RuntimeError: If the database manager has not been initialised.
        """
        if database_manager.database is None:
            raise RuntimeError("Database client is not initialised.")
        return database_manager.database["workouts"]

    def create_workout(self, workout_document: WorkoutDocument) -> str:
        """
        Inserts a new workout document into the database.

        Args:
            workout_document: The Pydantic model representing the workout.

        Returns:
            The newly created MongoDB ObjectId as a string.
        """
        document_dictionary: Dict[str, Any] = workout_document.model_dump(
            by_alias=True, exclude={"identifier"}
        )
        insertion_result = self.collection.insert_one(document_dictionary)
        logger.info("Workout inserted with identifier=%s", str(insertion_result.inserted_id))
        return str(insertion_result.inserted_id)

    def retrieve_workout_by_identifier(
        self, identifier: str, user_identifier: Optional[str] = None
    ) -> Optional[WorkoutDocument]:
        """
        Retrieves a single workout document by its unique identifier.

        Args:
            identifier: The MongoDB ObjectId string.

        Returns:
            A WorkoutDocument if found, otherwise None.
        """
        if not ObjectId.is_valid(identifier):
            logger.warning("Invalid workout identifier requested: %s", identifier)
            return None
        query_filter: Dict[str, Any] = {
            "_id": ObjectId(identifier),
            **_build_user_scope_filter(user_identifier),
        }
        document = self.collection.find_one(query_filter)
        if document:
            document["_id"] = str(document["_id"])
            logger.debug("Workout retrieved for identifier=%s", identifier)
            return WorkoutDocument(**document)
        logger.info("Workout not found for identifier=%s", identifier)
        return None

    def retrieve_all_workouts(self, user_identifier: Optional[str] = None) -> List[WorkoutDocument]:
        """
        Retrieves all workout documents in the database.

        Returns:
            A list of WorkoutDocument models.
        """
        query_filter: Dict[str, Any] = _build_user_scope_filter(user_identifier)
        cursor = self.collection.find(query_filter)
        workouts: List[WorkoutDocument] = []
        for document in cursor:
            document["_id"] = str(document["_id"])
            workouts.append(WorkoutDocument(**document))
        logger.debug("Retrieved %d workouts from database.", len(workouts))
        return workouts

    def retrieve_most_recent_workout(
        self, user_identifier: Optional[str] = None
    ) -> Optional[WorkoutDocument]:
        """
        Retrieves the most recent workout document for the active user scope.

        Args:
            user_identifier: Optional user scope.

        Returns:
            The most recent WorkoutDocument, or None when no workouts exist.
        """
        query_filter: Dict[str, Any] = _build_user_scope_filter(user_identifier)
        document = self.collection.find_one(query_filter, sort=[("date_of_workout", -1)])
        if document is None:
            return None
        document["_id"] = str(document["_id"])
        return WorkoutDocument(**document)

    def delete_workout_by_identifier(
        self, identifier: str, user_identifier: Optional[str] = None
    ) -> bool:
        """
        Permanently removes a workout document from the database.

        Args:
            identifier: The MongoDB ObjectId string.

        Returns:
            True if a document was successfully deleted, False otherwise.
        """
        if not ObjectId.is_valid(identifier):
            logger.warning("Delete rejected due to invalid identifier: %s", identifier)
            return False
        query_filter: Dict[str, Any] = {
            "_id": ObjectId(identifier),
            **_build_user_scope_filter(user_identifier),
        }
        deletion_result = self.collection.delete_one(query_filter)
        logger.info(
            "Delete workout identifier=%s deleted_count=%d",
            identifier,
            deletion_result.deleted_count,
        )
        return deletion_result.deleted_count > 0

    def update_workout_by_identifier(
        self,
        identifier: str,
        updated_workout: WorkoutDocument,
        user_identifier: Optional[str] = None,
    ) -> bool:
        """
        Updates specific fields of an existing workout document using $set.
        This preserves the original date_of_workout during an edit.
        """
        if not ObjectId.is_valid(identifier):
            logger.warning("Update rejected due to invalid identifier: %s", identifier)
            return False
        update_payload = {
            "$set": {
                "target_muscle_groups": updated_workout.target_muscle_groups,
                "workout_notes": updated_workout.workout_notes,
                "session_tags": updated_workout.session_tags,
                "exercises": [exercise.model_dump() for exercise in updated_workout.exercises],
            }
        }
        query_filter: Dict[str, Any] = {
            "_id": ObjectId(identifier),
            **_build_user_scope_filter(user_identifier),
        }
        update_result = self.collection.update_one(query_filter, update_payload)
        logger.info(
            "Update workout identifier=%s matched=%d modified=%d",
            identifier,
            update_result.matched_count,
            update_result.modified_count,
        )
        return update_result.matched_count > 0

    def delete_workouts_by_user_identifier(self, user_identifier: str) -> int:
        """
        Hard-deletes all workouts that belong to a specific user.
        """
        if not user_identifier:
            return 0
        deletion_result = self.collection.delete_many({"user_identifier": user_identifier})
        logger.info(
            "Delete workouts by user_identifier=%s deleted_count=%d",
            user_identifier,
            deletion_result.deleted_count,
        )
        return int(deletion_result.deleted_count)
