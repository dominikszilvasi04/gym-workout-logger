"""
Configuration classes
"""
import os
from typing import Optional

class ApplicationConfiguration:
    """
    Base configuration class containing default settings.
    """
    SECRET_KEY: Optional[str] = os.environ.get("APPLICATION_SECRET_KEY", "default_development_secret_key")
    DATABASE_URI: Optional[str] = os.environ.get("DATABASE_CONNECTION_URI", "mongodb://localhost:27017/")
    DATABASE_NAME: str = "gym_workout_logger_database"
    LOG_LEVEL: str = os.environ.get("APPLICATION_LOG_LEVEL", "INFO")
    SESSION_TYPE: str = os.environ.get("APPLICATION_SESSION_TYPE", "cachelib")
    SESSION_PERMANENT: bool = False
    SESSION_CACHE_DIR: str = os.environ.get("APPLICATION_SESSION_CACHE_DIR", ".flask_session")
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "Lax"
    SESSION_COOKIE_SECURE: bool = os.environ.get("APPLICATION_SESSION_COOKIE_SECURE", "false").lower() == "true"
    CSRF_PROTECTION_ENABLED: bool = os.environ.get("APPLICATION_CSRF_PROTECTION_ENABLED", "true").lower() == "true"
    RATE_LIMIT_DEFAULT: str = os.environ.get("APPLICATION_RATE_LIMIT_DEFAULT", "300 per hour")
    RATE_LIMIT_AUTH: str = os.environ.get("APPLICATION_RATE_LIMIT_AUTH", "60 per minute")
    RATE_LIMIT_API_WRITE: str = os.environ.get("APPLICATION_RATE_LIMIT_API_WRITE", "120 per minute")
    EXERCISE_REQUEST_RECIPIENT_EMAIL: Optional[str] = os.environ.get("APPLICATION_EXERCISE_REQUEST_RECIPIENT_EMAIL")
    SMTP_HOST: Optional[str] = os.environ.get("APPLICATION_SMTP_HOST")
    SMTP_PORT: int = int(os.environ.get("APPLICATION_SMTP_PORT", "587"))
    SMTP_USERNAME: Optional[str] = os.environ.get("APPLICATION_SMTP_USERNAME")
    SMTP_PASSWORD: Optional[str] = os.environ.get("APPLICATION_SMTP_PASSWORD")
    SMTP_SENDER_EMAIL: Optional[str] = os.environ.get("APPLICATION_SMTP_SENDER_EMAIL")
    SMTP_USE_TLS: bool = os.environ.get("APPLICATION_SMTP_USE_TLS", "true").lower() == "true"
    GOOGLE_OAUTH_ENABLED: bool = os.environ.get("APPLICATION_GOOGLE_OAUTH_ENABLED", "false").lower() == "true"
    GOOGLE_CLIENT_ID: Optional[str] = os.environ.get("APPLICATION_GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = os.environ.get("APPLICATION_GOOGLE_CLIENT_SECRET")
    GOOGLE_DISCOVERY_URL: str = os.environ.get(
        "APPLICATION_GOOGLE_DISCOVERY_URL",
        "https://accounts.google.com/.well-known/openid-configuration",
    )
    ADMIN_EMAIL_ALLOWLIST: tuple[str, ...] = tuple(
        value.strip().lower()
        for value in os.environ.get("APPLICATION_ADMIN_EMAIL_ALLOWLIST", "").split(",")
        if value.strip()
    )
    TESTING: bool = False
    DEBUG: bool = False

class DevelopmentConfiguration(ApplicationConfiguration):
    """
    Configuration for local development.
    """
    DEBUG: bool = True
    LOG_LEVEL: str = os.environ.get("APPLICATION_LOG_LEVEL", "DEBUG")

class TestingConfiguration(ApplicationConfiguration):
    """
    Configuration used for running unit and integration tests.
    """
    TESTING: bool = True
    DATABASE_NAME: str = "gym_workout_logger_testing_database"
    CSRF_PROTECTION_ENABLED: bool = False


class ProductionConfiguration(ApplicationConfiguration):
    """
    Configuration used for production and cloud deployments.
    """
    DEBUG: bool = False
    SESSION_COOKIE_SECURE: bool = os.environ.get("APPLICATION_SESSION_COOKIE_SECURE", "true").lower() == "true"