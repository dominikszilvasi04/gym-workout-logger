"""
Service layer containing logic for the logger.
"""
from typing import List, Optional
from application.models.workout import WorkoutDocument, ExerciseLog, WorkoutSet
from application.repositories.workout_repository import WorkoutRepository

class WorkoutService:
    """
    Encapsulates all operation logic and calculations for workout operations.
    Acts as the intermediary between the Controller (Flask routes) and the Database (Repository).
    """

    def __init__(self, workout_repository: WorkoutRepository) -> None:
        """
        Initialises the WorkoutService with a dedicated repository instance.
        
        Args:
            workout_repository: The injected data access object.
        """
        self.workout_repository = workout_repository

    def calculate_estimated_one_repetition_maximum(self, weight_in_kilograms: float, repetitions: int) -> float:
        """
        Calculates the estimated one repetition maximum using the standard Epley formula.
        
        Args:
            weight_in_kilograms: The weight lifted during the set.
            repetitions: The number of times the weight was lifted.
            
        Returns:
            The estimated absolute maximum weight the user could lift for a single repetition.
        """
        if repetitions <= 0:
            return 0.0
        if repetitions == 1:
            return weight_in_kilograms
        estimated_maximum: float = weight_in_kilograms * (1.0 + (repetitions / 30.0))
        return round(estimated_maximum, 2)

    def calculate_exercise_volume(self, exercise_log: ExerciseLog) -> float:
        """
        Calculates the total physical volume for a specific exercise.
        Volume is defined as Weight x Repetitions across all sets.
        
        Args:
            exercise_log: The Pydantic model representing the exercise and its sets.
            
        Returns:
            The total volume in kilograms.
        """
        total_exercise_volume: float = 0.0
        for workout_set in exercise_log.sets:
            total_exercise_volume += (workout_set.weight_in_kilograms * workout_set.repetitions)
        return round(total_exercise_volume, 2)

    def calculate_total_workout_volume(self, workout_document: WorkoutDocument) -> float:
        """
        Calculates the cumulative volume of the entire workout session.
        
        Args:
            workout_document: The complete workout record.
            
        Returns:
            The sum of all exercise volumes within the workout.
        """
        cumulative_volume: float = 0.0
        for exercise in workout_document.exercises:
            cumulative_volume += self.calculate_exercise_volume(exercise_log=exercise)
        return round(cumulative_volume, 2)

    def record_new_workout_session(self, workout_document: WorkoutDocument) -> str:
        """
        Validates and delegates the persistence of a new workout to the repository layer.
        
        Args:
            workout_document: The thoroughly validated Pydantic model.
            
        Returns:
            The unique string identifier of the newly created database record.
        """
        return self.workout_repository.create_workout(workout_document=workout_document)

    def retrieve_workout_history(self) -> List[WorkoutDocument]:
        """
        Retrieves the complete history of all logged workouts.
        
        Returns:
            A list of validated WorkoutDocument models.
        """
        return self.workout_repository.retrieve_all_workouts()
        
    def retrieve_specific_workout(self, identifier: str) -> Optional[WorkoutDocument]:
        """
        Retrieves a single workout session by its unique database identifier.
        
        Args:
            identifier: The string representation of the MongoDB ObjectId.
            
        Returns:
            The WorkoutDocument if found, otherwise None.
        """
        return self.workout_repository.retrieve_workout_by_identifier(identifier=identifier)
    
    def remove_workout_session(self, identifier: str) -> bool:
        """
        Delegates the deletion of a specific workout session to the repository.
        
        Args:
            identifier: The string representation of the database unique identifier.
            
        Returns:
            A boolean indicating the success of the deletion operation.
        """
        return self.workout_repository.delete_workout_by_identifier(identifier=identifier)