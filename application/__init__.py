"""
Application factory and initialisation module.
"""
import logging
from flask import Flask
from typing import Type
from application.configuration import ApplicationConfiguration, DevelopmentConfiguration
from application.database import database_manager
from application.controllers.workout_controller import workout_blueprint
from application.controllers.exercise_controller import exercise_blueprint
from application.controllers.auth_controller import auth_blueprint
from application.logging_configuration import configure_application_logging
logger = logging.getLogger(__name__)

def create_application(configuration_class: Type[ApplicationConfiguration] = DevelopmentConfiguration) -> Flask:
    """
    Creates and configures an instance of the Flask application.
    
    Args:
        configuration_class: The configuration class to use for the application.
                             Defaults to DevelopmentConfiguration.
                             
    Returns:
        A configured Flask application instance.
    """
    flask_application = Flask(__name__)
    flask_application.config.from_object(configuration_class)
    configure_application_logging(log_level=flask_application.config.get("LOG_LEVEL", "INFO"))
    logger.info("Application startup initiated with configuration: %s", configuration_class.__name__)
    database_uri = flask_application.config.get("DATABASE_URI")
    database_name = flask_application.config.get("DATABASE_NAME")
    if database_uri and database_name:
        database_manager.initialise_client(connection_uri=database_uri, database_name=database_name)
        logger.info("Database client initialised for database: %s", database_name)
        database_manager.database["users"].create_index("email", unique=True)
        logger.info("Ensured users collection unique index on email.")
    else:
        logger.warning("Database configuration missing. Client initialisation skipped.")

    flask_application.register_blueprint(workout_blueprint)
    flask_application.register_blueprint(exercise_blueprint)
    flask_application.register_blueprint(auth_blueprint)
    logger.info("Blueprints registered successfully.")

    @flask_application.route("/health_check")
    def health_check() -> dict[str, str]:
        """
        A simple endpoint to verify the application is running.
        
        Returns:
            A dictionary containing the application status.
        """
        logger.debug("Health check endpoint invoked.")
        return {"status": "Application is running successfully."}

    return flask_application