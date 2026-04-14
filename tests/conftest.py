"""
Pytest configuration and shared testing fixtures.
"""

import pytest
from flask import Flask
from flask.testing import FlaskClient
import mongomock
from application import create_application
from application.configuration import TestingConfiguration
from application.database import database_manager


@pytest.fixture(autouse=True)
def mock_database_connection() -> None:
    """
    Automatically replaces the real MongoDB client with an in-memory mock
    before every single test. This guarantees zero network calls to Atlas
    and ensures complete isolation.
    """
    # Overwrite the global client with a mock
    database_manager.client = mongomock.MongoClient()
    database_manager.database = database_manager.client[TestingConfiguration.DATABASE_NAME]

    yield  # The test runs here

    # Clean up the in-memory database after the test finishes
    if database_manager.client is not None:
        database_manager.client.drop_database(TestingConfiguration.DATABASE_NAME)


@pytest.fixture
def test_application() -> Flask:
    """
    Provides a configured Flask application instance explicitly set to Testing mode.
    """
    application_instance = create_application(configuration_class=TestingConfiguration)
    yield application_instance


@pytest.fixture
def test_client(test_application: Flask) -> FlaskClient:
    """
    Provides a virtual web client to simulate HTTP requests to our application
    without needing to start a live server.
    """
    return test_application.test_client()
