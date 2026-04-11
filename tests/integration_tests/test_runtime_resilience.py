"""
Integration tests for runtime resilience when database connectivity is unavailable.
"""
import pytest
from application.database import database_manager

pytestmark = pytest.mark.integration


def test_health_endpoint_reports_alive_when_database_is_not_initialised(test_client):
    """
    Verifies liveness endpoint stays healthy when the database handle is missing.
    """
    database_manager.database = None
    health_response = test_client.get("/health")
    assert health_response.status_code == 200
    health_payload = health_response.get_json()
    assert health_payload["status"] == "healthy"
    assert health_payload["database"] == "disconnected"


def test_readiness_endpoint_reports_not_ready_when_database_is_not_initialised(test_client):
    """
    Verifies readiness endpoint reports 503 when the database handle is missing.
    """
    database_manager.database = None
    readiness_response = test_client.get("/ready")
    assert readiness_response.status_code == 503
    readiness_payload = readiness_response.get_json()
    assert readiness_payload["status"] == "not_ready"
    assert readiness_payload["database"] == "disconnected"


def test_workout_list_returns_503_when_database_is_not_initialised(test_client):
    """
    Verifies workout API route handles repository runtime errors gracefully.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "Resilience User",
            "email": "resilience.workouts@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )
    database_manager.database = None
    workouts_response = test_client.get("/api/workouts")
    assert workouts_response.status_code == 503
    assert workouts_response.get_json()["error"] == "Database unavailable."


def test_dashboard_analytics_returns_503_when_database_is_not_initialised_for_authenticated_user(test_client):
    """
    Verifies analytics endpoint returns explicit 503 JSON payload when DB is unavailable.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "Resilience User",
            "email": "resilience.user@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )
    database_manager.database = None
    analytics_response = test_client.get("/api/dashboard/analytics")
    assert analytics_response.status_code == 503
    analytics_payload = analytics_response.get_json()
    assert analytics_payload["error"] == "Database unavailable."
