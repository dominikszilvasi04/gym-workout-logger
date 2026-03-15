"""
Configuration classes for the Gym Workout Logger application.
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
    TESTING: bool = False
    DEBUG: bool = False

class DevelopmentConfiguration(ApplicationConfiguration):
    """
    Configuration for local development.
    """
    DEBUG: bool = True

class TestingConfiguration(ApplicationConfiguration):
    """
    Configuration used for running unit and integration tests.
    """
    TESTING: bool = True
    DATABASE_NAME: str = "gym_workout_logger_testing_database"