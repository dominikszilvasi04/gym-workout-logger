"""
Pydantic models for reusable workout templates.
"""
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from application.models.workout import ExerciseLog

class WorkoutTemplateDocument(BaseModel):
    """
    Represents a reusable routine template owned by a user.
    """
    model_config = ConfigDict(populate_by_name=True)

    identifier: Optional[str] = Field(default=None, alias="_id", description="The MongoDB ObjectId as a string.")
    user_identifier: Optional[str] = Field(default=None, description="The owning user account identifier.")
    template_name: str = Field(..., min_length=1, max_length=80, description="Human readable template name.")
    target_muscle_groups: list[str] = Field(default_factory=list, description="Primary muscle groups for the template.")
    exercises: list[ExerciseLog] = Field(default_factory=list, description="Preconfigured exercises and set defaults.")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="UTC creation timestamp.")
