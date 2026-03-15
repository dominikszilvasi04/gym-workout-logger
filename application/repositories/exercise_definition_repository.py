"""
Repository layer for interacting with the strictly defined exercise definitions collection.
"""
import logging
from typing import List, Dict, Any
from application.database import database_manager
from application.models.exercise_definition import ExerciseDefinition

logger = logging.getLogger(__name__)

class ExerciseDefinitionRepository:
    """
    Handles all database operations for the master list of ExerciseDefinitions.
    """

    @property
    def collection(self) -> Any:
        """
        Retrieves the MongoDB collection for exercise definitions.
        
        Raises:
            RuntimeError: If the database manager has not been initialised.
        """
        if database_manager.database is None:
            raise RuntimeError("Database client is not initialised.")
        return database_manager.database["exercise_definitions"]

    def retrieve_all_exercise_definitions(self) -> List[ExerciseDefinition]:
        """
        Retrieves all standardised exercises, sorted alphabetically by name.
        
        Returns:
            A list of ExerciseDefinition models.
        """
        cursor = self.collection.find().sort("exercise_name", 1)
        exercise_definitions: List[ExerciseDefinition] = []
        for document in cursor:
            document["_id"] = str(document["_id"])
            exercise_definitions.append(ExerciseDefinition(**document))
        logger.debug("Retrieved %d exercise definitions.", len(exercise_definitions))
        return exercise_definitions

    def create_exercise_definition(self, exercise_definition: ExerciseDefinition) -> str:
        """
        Inserts a new standardised exercise into the master list.
        
        Args:
            exercise_definition: The strict Pydantic model representing the exercise.
            
        Returns:
            The newly created MongoDB ObjectId as a string.
        """
        document_dictionary: Dict[str, Any] = exercise_definition.model_dump(by_alias=True, exclude={"identifier"})
        insertion_result = self.collection.insert_one(document_dictionary)
        logger.info("Exercise definition inserted with identifier=%s", str(insertion_result.inserted_id))
        return str(insertion_result.inserted_id)