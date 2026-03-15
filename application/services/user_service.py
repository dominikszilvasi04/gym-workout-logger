"""
Service layer for user account registration and authentication.
"""
import logging
from typing import Optional
from pymongo.errors import DuplicateKeyError
from werkzeug.security import generate_password_hash, check_password_hash
from application.repositories.user_repository import UserRepository
from application.models.user import UserDocument

logger = logging.getLogger(__name__)


class UserService:
    """
    Encapsulates user account and authentication logic.
    """

    def __init__(self, user_repository: UserRepository) -> None:
        self.user_repository = user_repository

    def register_user(self, email: str, password: str, display_name: Optional[str] = None) -> tuple[bool, str]:
        """
        Registers a user if the email is not already taken.

        Returns:
            (success, message_or_identifier)
        """
        normalized_email = email.lower().strip()
        if len(normalized_email) < 3 or "@" not in normalized_email:
            return False, "Please provide a valid email address."
        if len(password) < 6:
            return False, "Password must be at least 6 characters."

        existing_user = self.user_repository.retrieve_user_by_email(normalized_email)
        if existing_user:
            return False, "An account with this email already exists."

        user_document = UserDocument(
            email=normalized_email,
            password_hash=generate_password_hash(password),
            display_name=display_name.strip() if display_name else None,
        )

        try:
            created_identifier = self.user_repository.create_user(user_document)
            logger.info("New user account registered for email=%s", normalized_email)
            return True, created_identifier
        except DuplicateKeyError:
            logger.warning("Duplicate registration attempted for email=%s", normalized_email)
            return False, "An account with this email already exists."

    def authenticate_user(self, email: str, password: str) -> Optional[UserDocument]:
        """
        Authenticates a user by email and password.
        """
        normalized_email = email.lower().strip()
        user = self.user_repository.retrieve_user_by_email(normalized_email)
        if not user:
            logger.info("Authentication failed: unknown email=%s", normalized_email)
            return None
        if not check_password_hash(user.password_hash, password):
            logger.info("Authentication failed: invalid password for email=%s", normalized_email)
            return None
        logger.info("Authentication successful for email=%s", normalized_email)
        return user

    def retrieve_user(self, identifier: str) -> Optional[UserDocument]:
        """
        Retrieves a user by id.
        """
        return self.user_repository.retrieve_user_by_identifier(identifier)
