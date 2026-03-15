"""
Main entry point to run the Flask development server.
"""
from application import create_application

gym_logger_application = create_application()


if __name__ == "__main__":
    gym_logger_application.run(host="0.0.0.0", port=5000)