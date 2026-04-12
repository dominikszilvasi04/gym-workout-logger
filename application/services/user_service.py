"""
Service layer for user account registration and authentication.
"""
import logging
from typing import Optional
from passlib.context import CryptContext
from pymongo.errors import DuplicateKeyError
from werkzeug.security import check_password_hash
from application.repositories.user_repository import UserRepository
from application.models.user import UserDocument

logger = logging.getLogger(__name__)
password_hashing_context = CryptContext(schemes=["argon2"], deprecated="auto")


class UserService:
    """
    Encapsulates user account and authentication logic.
    """

    def __init__(self, user_repository: UserRepository) -> None:
        self.user_repository = user_repository

    def hash_password(self, plain_password: str) -> str:
        """
        Hashes a password using Argon2.
        """
        return password_hashing_context.hash(plain_password)

    def verify_password(self, plain_password: str, stored_password_hash: str) -> bool:
        """
        Verifies a plain password against current and legacy hash formats.
        """
        if not stored_password_hash:
            return False
        if stored_password_hash.startswith("$argon2"):
            return password_hashing_context.verify(plain_password, stored_password_hash)
        return check_password_hash(stored_password_hash, plain_password)

    def needs_password_rehash(self, stored_password_hash: str) -> bool:
        """
        Determines whether a password hash should be upgraded to current policy.
        """
        if not stored_password_hash:
            return False
        if stored_password_hash.startswith("$argon2"):
            return password_hashing_context.needs_update(stored_password_hash)
        return True

    def register_user(self, email: str, password: str, display_name: Optional[str] = None) -> tuple[bool, str]:
        """
        Registers a user if the email is not already taken.

        Returns:
            (success, message_or_identifier)
        """
        normalised_email = email.lower().strip()
        if len(normalised_email) < 3 or "@" not in normalised_email:
            return False, "Please provide a valid email address."
        if len(password) < 6:
            return False, "Password must be at least 6 characters."
        existing_user = self.user_repository.retrieve_user_by_email(normalised_email)
        if existing_user:
            return False, "An account with this email already exists."
        user_document = UserDocument(
            email=normalised_email,
            password_hash=self.hash_password(password),
            display_name=display_name.strip() if display_name else None,
        )
        try:
            created_identifier = self.user_repository.create_user(user_document)
            logger.info("New user account registered for email=%s", normalised_email)
            return True, created_identifier
        except DuplicateKeyError:
            logger.warning("Duplicate registration attempted for email=%s", normalised_email)
            return False, "An account with this email already exists."

    def authenticate_user(self, email: str, password: str) -> Optional[UserDocument]:
        """
        Authenticates a user by email and password.
        """
        normalised_email = email.lower().strip()
        user = self.user_repository.retrieve_user_by_email(normalised_email)
        if not user:
            logger.info("Authentication failed: unknown email=%s", normalised_email)
            return None
        if not user.password_hash:
            logger.info("Authentication failed: account requires external provider for email=%s", normalised_email)
            return None
        if not self.verify_password(password, user.password_hash):
            logger.info("Authentication failed: invalid password for email=%s", normalised_email)
            return None
        if user.identifier and self.needs_password_rehash(user.password_hash):
            upgraded_hash = self.hash_password(password)
            self.user_repository.update_user_password_hash(user.identifier, upgraded_hash)
            logger.info("Upgraded password hash policy for user_identifier=%s", user.identifier)
        logger.info("Authentication successful for email=%s", normalised_email)
        return user

    def retrieve_user(self, identifier: str) -> Optional[UserDocument]:
        """
        Retrieves a user by id.
        """
        return self.user_repository.retrieve_user_by_identifier(identifier)

    def update_display_name(self, identifier: str, display_name: Optional[str]) -> Optional[UserDocument]:
        """
        Updates the display name for an authenticated user.
        """
        user = self.retrieve_user(identifier)
        if not user:
            return None

        cleaned_display_name = display_name.strip() if display_name else None
        if cleaned_display_name == "":
            cleaned_display_name = None
        if cleaned_display_name and len(cleaned_display_name) > 80:
            raise ValueError("Display name must be 80 characters or fewer.")

        updated = self.user_repository.update_user_display_name(identifier, cleaned_display_name)
        if not updated:
            return None
        return self.retrieve_user(identifier)

    def authenticate_or_register_google_user(
        self,
        email: str,
        google_subject: str,
        display_name: Optional[str] = None,
    ) -> Optional[UserDocument]:
        """
        Authenticates or creates a user from Google OAuth identity.
        """
        normalised_email = email.lower().strip()
        if len(normalised_email) < 3 or "@" not in normalised_email or not google_subject:
            return None

        existing_provider_user = self.user_repository.retrieve_user_by_auth_provider_subject(
            auth_provider="google",
            auth_provider_subject=google_subject,
        )
        if existing_provider_user:
            if existing_provider_user.identifier and display_name and not existing_provider_user.display_name:
                self.user_repository.update_user_display_name(existing_provider_user.identifier, display_name.strip())
                return self.user_repository.retrieve_user_by_identifier(existing_provider_user.identifier)
            return existing_provider_user

        existing_email_user = self.user_repository.retrieve_user_by_email(normalised_email)
        if existing_email_user:
            if existing_email_user.auth_provider == "google" and existing_email_user.auth_provider_subject != google_subject:
                logger.warning("Google subject mismatch for existing email=%s", normalised_email)
                return None
            if existing_email_user.identifier:
                self.user_repository.update_user_auth_provider(
                    identifier=existing_email_user.identifier,
                    auth_provider="google",
                    auth_provider_subject=google_subject,
                )
                if display_name and not existing_email_user.display_name:
                    self.user_repository.update_user_display_name(existing_email_user.identifier, display_name.strip())
                return self.user_repository.retrieve_user_by_identifier(existing_email_user.identifier)
            return existing_email_user

        user_document = UserDocument(
            email=normalised_email,
            password_hash=None,
            auth_provider="google",
            auth_provider_subject=google_subject,
            display_name=display_name.strip() if display_name else None,
        )
        try:
            created_identifier = self.user_repository.create_user(user_document)
            return self.user_repository.retrieve_user_by_identifier(created_identifier)
        except DuplicateKeyError:
            logger.warning("Duplicate Google OAuth creation attempted for email=%s", normalised_email)
            return self.user_repository.retrieve_user_by_email(normalised_email)
