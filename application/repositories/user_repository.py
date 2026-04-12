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

    def update_user_password_hash(self, identifier: str, password_hash: str) -> bool:
        """
        Updates a user's password hash.
        """
        if not ObjectId.is_valid(identifier):
            return False
        update_result = self.collection.update_one(
            {"_id": ObjectId(identifier)},
            {"$set": {"password_hash": password_hash}}
        )
        return update_result.matched_count > 0

    def retrieve_user_by_auth_provider_subject(self, auth_provider: str, auth_provider_subject: str) -> Optional[UserDocument]:
        """
        Retrieves a user by external auth provider subject.
        """
        document = self.collection.find_one(
            {
                "auth_provider": auth_provider,
                "auth_provider_subject": auth_provider_subject,
            }
        )
        if not document:
            return None
        document["_id"] = str(document["_id"])
        return UserDocument(**document)

    def update_user_auth_provider(self, identifier: str, auth_provider: str, auth_provider_subject: str) -> bool:
        """
        Links an existing user account to an auth provider identity.
        """
        if not ObjectId.is_valid(identifier):
            return False
        update_result = self.collection.update_one(
            {"_id": ObjectId(identifier)},
            {
                "$set": {
                    "auth_provider": auth_provider,
                    "auth_provider_subject": auth_provider_subject,
                }
            },
        )
        return update_result.matched_count > 0

    def update_user_display_name(self, identifier: str, display_name: Optional[str]) -> bool:
        """
        Updates a user's display name.
        """
        if not ObjectId.is_valid(identifier):
            return False
        update_result = self.collection.update_one(
            {"_id": ObjectId(identifier)},
            {"$set": {"display_name": display_name}},
        )
        return update_result.matched_count > 0

    def update_user_role(self, identifier: str, role: str) -> bool:
        """
        Updates a user's authorization role.
        """
        if not ObjectId.is_valid(identifier):
            return False
        cleaned_role = (role or "user").strip().lower() or "user"
        update_result = self.collection.update_one(
            {"_id": ObjectId(identifier)},
            {"$set": {"role": cleaned_role}},
        )
        return update_result.matched_count > 0

    def retrieve_all_users(self) -> list[UserDocument]:
        """
        Retrieves all users sorted by newest first.
        """
        cursor = self.collection.find({}).sort("created_at", -1)
        users: list[UserDocument] = []
        for document in cursor:
            document["_id"] = str(document["_id"])
            users.append(UserDocument(**document))
        return users

    def delete_user_by_identifier(self, identifier: str) -> bool:
        """
        Hard-deletes a user by MongoDB identifier.
        """
        if not ObjectId.is_valid(identifier):
            return False
        deletion_result = self.collection.delete_one({"_id": ObjectId(identifier)})
        return deletion_result.deleted_count > 0

