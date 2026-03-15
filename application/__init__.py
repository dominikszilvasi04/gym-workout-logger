"""
Application factory and initialisation module.
"""
from flask import Flask
from typing import Type
from application.configuration import ApplicationConfiguration, DevelopmentConfiguration
from application.database import database_manager
import os

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
    database_uri = flask_application.config.get("DATABASE_URI")
    database_name = flask_application.config.get("DATABASE_NAME")
    if database_uri and database_name:
        database_manager.initialise_client(connection_uri=database_uri, database_name=database_name)
    from application.controllers.workout_controller import workout_blueprint
    flask_application.register_blueprint(workout_blueprint)

    @flask_application.route("/health_check")
    def health_check() -> dict[str, str]:
        """
        A simple endpoint to verify the application is running.
        
        Returns:
            A dictionary containing the application status.
        """
        return {"status": "Application is running successfully."}

    return flask_application