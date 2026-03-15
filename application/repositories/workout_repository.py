"""
Repository layer for interacting with the workouts MongoDB collection.
"""
import logging
from typing import List, Optional, Dict, Any
from bson.objectid import ObjectId
from application.database import database_manager
from application.models.workout import WorkoutDocument

logger = logging.getLogger(__name__)

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
        document_dictionary: Dict[str, Any] = workout_document.model_dump(by_alias=True, exclude={"identifier"})
        insertion_result = self.collection.insert_one(document_dictionary)
        logger.info("Workout inserted with identifier=%s", str(insertion_result.inserted_id))
        return str(insertion_result.inserted_id)

    def retrieve_workout_by_identifier(self, identifier: str) -> Optional[WorkoutDocument]:
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
        document = self.collection.find_one({"_id": ObjectId(identifier)})
        if document:
            document["_id"] = str(document["_id"])
            logger.debug("Workout retrieved for identifier=%s", identifier)
            return WorkoutDocument(**document)
        logger.info("Workout not found for identifier=%s", identifier)
        return None

    def retrieve_all_workouts(self) -> List[WorkoutDocument]:
        """
        Retrieves all workout documents in the database.
        
        Returns:
            A list of WorkoutDocument models.
        """
        cursor = self.collection.find()
        workouts: List[WorkoutDocument] = []
        for document in cursor:
            document["_id"] = str(document["_id"])
            workouts.append(WorkoutDocument(**document))
        logger.debug("Retrieved %d workouts from database.", len(workouts))
        return workouts
    
    def delete_workout_by_identifier(self, identifier: str) -> bool:
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
        deletion_result = self.collection.delete_one({"_id": ObjectId(identifier)})
        logger.info("Delete workout identifier=%s deleted_count=%d", identifier, deletion_result.deleted_count)
        return deletion_result.deleted_count > 0
    
    def update_workout_by_identifier(self, identifier: str, updated_workout: WorkoutDocument) -> bool:
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
                "exercises": [exercise.model_dump() for exercise in updated_workout.exercises]
            }
        }
        update_result = self.collection.update_one(
            {"_id": ObjectId(identifier)}, 
            update_payload
        )
        logger.info(
            "Update workout identifier=%s matched=%d modified=%d",
            identifier,
            update_result.matched_count,
            update_result.modified_count
        )
        return update_result.matched_count > 0