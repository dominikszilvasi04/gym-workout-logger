"""
Main entry point to run the Flask development server.
"""
import logging
from dotenv import load_dotenv
load_dotenv()
from application import create_application

gym_logger_application = create_application()
logger = logging.getLogger(__name__)


if __name__ == "__main__":
    logger.info("Starting Flask development server on 0.0.0.0:5000")
    gym_logger_application.run(host="0.0.0.0", port=5000)