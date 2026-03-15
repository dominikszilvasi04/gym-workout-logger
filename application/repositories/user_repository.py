"""
Repository layer for interacting with user accounts.
"""
import logging
from typing import Optional, Dict, Any
from bson.objectid import ObjectId
from application.database import database_manager
from application.models.user import UserDocument

logger = logging.getLogger(__name__)


class UserRepository:
    """
    Handles all database operations for UserDocument entities.
    """

    @property
    def collection(self) -> Any:
        """
        Retrieves the MongoDB collection for users.
        """
        if database_manager.database is None:
            raise RuntimeError("Database client is not initialised.")
        return database_manager.database["users"]

    def create_user(self, user_document: UserDocument) -> str:
        """
        Inserts a new user document into the database.
        """
        document_dictionary: Dict[str, Any] = user_document.model_dump(by_alias=True, exclude={"identifier"})
        insertion_result = self.collection.insert_one(document_dictionary)
        logger.info("User inserted with identifier=%s", str(insertion_result.inserted_id))
        return str(insertion_result.inserted_id)

    def retrieve_user_by_email(self, email: str) -> Optional[UserDocument]:
        """
        Retrieves a user by email.
        """
        document = self.collection.find_one({"email": email.lower().strip()})
        if not document:
            return None
        document["_id"] = str(document["_id"])
        return UserDocument(**document)

    def retrieve_user_by_identifier(self, identifier: str) -> Optional[UserDocument]:
        """
        Retrieves a user by MongoDB identifier.
        """
        if not ObjectId.is_valid(identifier):
            return None
        document = self.collection.find_one({"_id": ObjectId(identifier)})
        if not document:
            return None
        document["_id"] = str(document["_id"])
        return UserDocument(**document)
