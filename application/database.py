"""
Database client initialisation module.
"""
from pymongo import MongoClient
from pymongo.database import Database
from typing import Optional

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
        cls.client = MongoClient(connection_uri)
        cls.database = cls.client[database_name]

database_manager = DatabaseManager()