"""
Main entry point to run the Flask development server.
"""
import logging
import os
from dotenv import load_dotenv
load_dotenv()
from application import create_application
from application.configuration import DevelopmentConfiguration, TestingConfiguration, ProductionConfiguration


def resolve_configuration_class():
    """
    Selects the configuration profile based on APPLICATION_ENV.
    """
    application_environment = os.environ.get("APPLICATION_ENV", "development").strip().lower()
    if application_environment == "production":
        return ProductionConfiguration
    if application_environment == "testing":
        return TestingConfiguration
    return DevelopmentConfiguration

gym_logger_application = create_application(configuration_class=resolve_configuration_class())
logger = logging.getLogger(__name__)


if __name__ == "__main__":
    application_port = int(os.environ.get("PORT", "5000"))
    logger.info("Starting Flask development server on 0.0.0.0:%s", application_port)
    gym_logger_application.run(host="0.0.0.0", port=application_port)