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
    password_hash: Optional[str] = Field(default=None, description="Secure hash of the user password for local credentials.")
    auth_provider: Optional[str] = Field(default=None, description="Authentication provider (e.g., local, google).")
    auth_provider_subject: Optional[str] = Field(default=None, description="Stable subject identifier from external provider.")
    display_name: Optional[str] = Field(default=None, description="Optional name displayed in the UI.")
    role: str = Field(default="user", description="Application role used for authorization checks (e.g., user, admin).")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="UTC account creation timestamp.")
