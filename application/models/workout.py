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
    rate_of_perceived_exertion: Optional[int] = Field(default=None, ge=1, le=10, description="Optional intensity scale from 1 to 10.")

class ExerciseLog(BaseModel):
    """
    Represents an exercise performed during a workout, containing multiple sets.
    """
    exercise_name: str = Field(..., min_length=1, description="The standard name of the exercise.")
    exercise_definition_identifier: Optional[str] = Field(default=None, description="The unique identifier mapping to the master ExerciseDefinition collection.")
    sets: List[WorkoutSet] = Field(default_factory=list, description="A list of sets performed for this exercise.")

class WorkoutDocument(BaseModel):
    """
    Represents a complete workout session. 
    This is the root document stored in the MongoDB collection.
    """
    model_config = ConfigDict(populate_by_name=True)

    identifier: Optional[str] = Field(default=None, alias="_id", description="The MongoDB ObjectId as a string.")
    user_identifier: Optional[str] = Field(default=None, description="The owning user account identifier.")
    date_of_workout: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="The date and time the workout occurred.")
    target_muscle_groups: List[str] = Field(default_factory=list, description="The primary muscle groups targeted.")
    workout_notes: Optional[str] = Field(default=None, description="Optional free-text notes captured for the session.")
    session_tags: List[str] = Field(default_factory=list, description="Optional tags that classify the workout session.")
    exercises: List[ExerciseLog] = Field(default_factory=list, description="A list of all exercises performed during the workout.")