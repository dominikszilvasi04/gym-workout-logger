"""
Pydantic models for strictly defining standard exercises.
"""

from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ExerciseDefinition(BaseModel):
    """
    Represents a strictly defined, standard exercise in the application.
    This ensures data consistency across all user workouts for accurate charting.
    """

    model_config = ConfigDict(populate_by_name=True)
    identifier: Optional[str] = Field(
        default=None, alias="_id", description="The MongoDB ObjectId as a string."
    )
    exercise_name: str = Field(
        ...,
        min_length=1,
        description="The standardised name of the exercise (e.g., 'Barbell Bench Press').",
    )
    primary_muscle_group: str = Field(
        ..., min_length=1, description="The main muscle group targeted (e.g., 'Chest')."
    )
    equipment_required: str = Field(
        default="None", description="The equipment needed (e.g., 'Barbell', 'Dumbbell', 'Machine')."
    )
