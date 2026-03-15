"""
Pydantic model for application user accounts.
"""
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class UserDocument(BaseModel):
    """
    Represents an application user account stored in MongoDB.
    """
    model_config = ConfigDict(populate_by_name=True)

    identifier: Optional[str] = Field(default=None, alias="_id", description="The MongoDB ObjectId as a string.")
    email: str = Field(..., min_length=3, description="Unique login email address.")
    password_hash: str = Field(..., min_length=1, description="Secure hash of the user password.")
    display_name: Optional[str] = Field(default=None, description="Optional name displayed in the UI.")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="UTC account creation timestamp.")
