"""
Pydantic data models for the Gym Workout Logger domain.
"""
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class WorkoutSet(BaseModel):
    """
    Represents a single set of a specific exercise.
    """
    repetitions: int = Field(..., gt=0, description="The number of repetitions completed.")
    weight_in_kilograms: float = Field(..., ge=0.0, description="The weight lifted in kilograms.")
    rate_of_perceived_exertion: int = Field(..., ge=1, le=10, description="Intensity scale from 1 to 10.")

class ExerciseLog(BaseModel):
    """
    Represents an exercise performed during a workout, containing multiple sets.
    """
    exercise_name: str = Field(..., min_length=1, description="The full name of the exercise.")
    sets: List[WorkoutSet] = Field(default_factory=list, description="A list of sets performed for this exercise.")

class WorkoutDocument(BaseModel):
    """
    Represents a complete workout session. 
    This is the root document stored in the MongoDB collection.
    """
    model_config = ConfigDict(populate_by_name=True)

    identifier: Optional[str] = Field(default=None, alias="_id", description="The MongoDB ObjectId as a string.")
    date_of_workout: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="The date and time the workout occurred.")
    target_muscle_groups: List[str] = Field(default_factory=list, description="The primary muscle groups targeted.")
    exercises: List[ExerciseLog] = Field(default_factory=list, description="A list of all exercises performed during the workout.")