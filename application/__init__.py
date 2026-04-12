"""
Application factory and initialisation module.
"""
import logging
import os
from pathlib import Path
from flask import Flask
from flask import send_from_directory
from flask import abort
from flask_session import Session
from cachelib import FileSystemCache
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import OperationFailure
from typing import Type
from application.configuration import ApplicationConfiguration, DevelopmentConfiguration
from application.database import database_manager
from application.controllers.workout_controller import workout_blueprint
from application.controllers.exercise_controller import exercise_blueprint
from application.controllers.auth_controller import auth_blueprint
from application.controllers.admin_controller import admin_blueprint
from application.controllers.health_controller import health_blueprint
from application.logging_configuration import configure_application_logging
from application.security import limiter, register_security_hooks
logger = logging.getLogger(__name__)
session_extension = Session()

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
    frontend_dist_directory = Path(flask_application.root_path).parent / "frontend" / "dist"
    flask_application.config["FRONTEND_DIST_DIRECTORY"] = str(frontend_dist_directory)

    default_secret_key = "default_development_secret_key"
    configured_secret_key = flask_application.config.get("SECRET_KEY")
    if configured_secret_key == default_secret_key:
        if flask_application.config.get("DEBUG", False):
            logger.warning("Using development fallback secret key. Set APPLICATION_SECRET_KEY for stronger security.")
        elif not flask_application.config.get("TESTING", False):
            raise RuntimeError("APPLICATION_SECRET_KEY must be configured for non-debug environments.")

    session_cache_directory = flask_application.config.get("SESSION_CACHE_DIR", ".flask_session")
    os.makedirs(session_cache_directory, exist_ok=True)
    flask_application.config["SESSION_TYPE"] = "cachelib"
    flask_application.config["SESSION_CACHELIB"] = FileSystemCache(
        cache_dir=session_cache_directory,
        threshold=500,
        mode=0o600,
    )
    flask_application.config["RATELIMIT_DEFAULT"] = flask_application.config.get("RATE_LIMIT_DEFAULT", "300 per hour")

    session_extension.init_app(flask_application)
    limiter.init_app(flask_application)
    register_security_hooks(flask_application)
    configure_application_logging(log_level=flask_application.config.get("LOG_LEVEL", "INFO"))
    logger.info("Application startup initiated with configuration: %s", configuration_class.__name__)
    database_uri = flask_application.config.get("DATABASE_URI")
    database_name = flask_application.config.get("DATABASE_NAME")
    if database_uri and database_name:
        try:
            database_manager.initialise_client(connection_uri=database_uri, database_name=database_name)
            logger.info("Database client initialised for database: %s", database_name)
            database_manager.database["users"].create_index("email", unique=True)
            try:
                database_manager.database["users"].create_index(
                    [("auth_provider", ASCENDING), ("auth_provider_subject", ASCENDING)],
                    unique=True,
                    partialFilterExpression={
                        "auth_provider": {"$type": "string"},
                        "auth_provider_subject": {"$type": "string"},
                    },
                )
            except OperationFailure as operation_failure:
                if operation_failure.code in (85, 86):
                    logger.warning(
                        "User auth provider index already exists with different options; continuing with existing index."
                    )
                else:
                    raise
            database_manager.database["exercise_definitions"].create_index("exercise_name", unique=True)
            database_manager.database["workouts"].create_index([("user_identifier", ASCENDING), ("date_of_workout", DESCENDING)])
            database_manager.database["workouts"].create_index([("user_identifier", ASCENDING), ("_id", ASCENDING)])
            database_manager.database["exercise_goals"].create_index([("user_identifier", ASCENDING), ("exercise_name", ASCENDING)])
            database_manager.database["workout_templates"].create_index([("user_identifier", ASCENDING), ("template_name", ASCENDING)])
            database_manager.database["admin_audit_logs"].create_index([("timestamp", DESCENDING)])
            logger.info("Ensured users collection unique index on email.")
            logger.info("Ensured users collection unique index on auth_provider/auth_provider_subject.")
            logger.info("Ensured exercise_definitions collection unique index on exercise_name.")
            logger.info("Ensured workouts indexes for user/date analytics and user/identifier ownership checks.")
            logger.info("Ensured exercise_goals index for user/exercise lookups.")
            logger.info("Ensured workout_templates index for user/template lookups.")
            logger.info("Ensured admin_audit_logs index for descending timestamp queries.")
        except Exception:
            database_manager.database = None
            logger.exception("Database initialisation failed during application startup.")
    else:
        logger.warning("Database configuration missing. Client initialisation skipped.")

    flask_application.register_blueprint(workout_blueprint)
    flask_application.register_blueprint(exercise_blueprint)
    flask_application.register_blueprint(auth_blueprint)
    flask_application.register_blueprint(admin_blueprint)
    flask_application.register_blueprint(health_blueprint)

    @flask_application.route("/assets/<path:asset_path>")
    def serve_frontend_asset(asset_path: str):
        if not frontend_dist_directory.exists():
            return abort(404)
        assets_directory = frontend_dist_directory / "assets"
        if not assets_directory.exists():
            return abort(404)
        return send_from_directory(str(assets_directory), asset_path)

    @flask_application.route("/<path:frontend_path>", methods=["GET"])
    def serve_frontend_path(frontend_path: str):
        if frontend_path.startswith("api/"):
            return abort(404)
        if not frontend_dist_directory.exists():
            return abort(404)

        requested_file = frontend_dist_directory / frontend_path
        if requested_file.exists() and requested_file.is_file():
            return send_from_directory(str(frontend_dist_directory), frontend_path)

        frontend_index_file = frontend_dist_directory / "index.html"
        if frontend_index_file.exists():
            return send_from_directory(str(frontend_dist_directory), "index.html")

        return abort(404)

    logger.info("Blueprints registered successfully.")

    return flask_application