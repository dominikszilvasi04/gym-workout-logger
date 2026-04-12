"""
Pydantic models for user exercise goals.
"""
from datetime import date, datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ExerciseGoalDocument(BaseModel):
    """
    Represents a user-defined strength goal for a specific exercise.
    """
    model_config = ConfigDict(populate_by_name=True)

    identifier: Optional[str] = Field(default=None, alias="_id", description="The MongoDB ObjectId as a string.")
    user_identifier: Optional[str] = Field(default=None, description="The owning user account identifier.")
    exercise_name: str = Field(..., min_length=1, max_length=120, description="Exercise name the goal targets.")
    exercise_definition_identifier: Optional[str] = Field(default=None, description="Optional canonical exercise identifier.")
    target_weight_in_kilograms: float = Field(..., gt=0, description="Goal target weight in kilograms.")
    target_repetitions: int = Field(..., gt=0, description="Goal target repetitions.")
    target_date: Optional[date] = Field(default=None, description="Optional target date for the goal.")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="UTC creation timestamp.")
