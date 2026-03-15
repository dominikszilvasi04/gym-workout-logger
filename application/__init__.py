"""
Application factory and initialization module.
"""
from flask import Flask
from typing import Type
from application.configuration import ApplicationConfiguration, DevelopmentConfiguration

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

    # Note: We will initialize our Database Client here in Phase 2
    # Note: We will register our Blueprint Controllers here in Phase 4

    @flask_application.route("/health_check")
    def health_check() -> dict[str, str]:
        """
        A simple endpoint to verify the application is running.
        
        Returns:
            A dictionary containing the application status.
        """
        return {"status": "Application is running successfully."}

    return flask_application