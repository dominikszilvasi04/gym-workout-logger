"""
Database client initialisation module.
"""
import logging
from pymongo import MongoClient
from pymongo.database import Database
from typing import Optional

logger = logging.getLogger(__name__)

class DatabaseManager:
    """
    Manager to hold the active database connection.
    """
    client: Optional[MongoClient] = None
    database: Optional[Database] = None

    @classmethod
    def initialise_client(cls, connection_uri: str, database_name: str) -> None:
        """
        Initialises the PyMongo client and sets the active database.
        """
        logger.info("Initialising MongoDB client for database: %s", database_name)
        cls.client = MongoClient(connection_uri)
        cls.database = cls.client[database_name]
        logger.info("MongoDB client initialised successfully.")

database_manager = DatabaseManager()