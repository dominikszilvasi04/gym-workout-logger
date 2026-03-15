"""
Integration tests for runtime resilience when database connectivity is unavailable.
"""
from application.database import database_manager


def test_health_endpoint_reports_unhealthy_when_database_is_not_initialised(test_client):
    """
    Verifies health endpoint reports 503 when the database handle is missing.
    """
    database_manager.database = None
    health_response = test_client.get("/health")
    assert health_response.status_code == 503
    health_payload = health_response.get_json()
    assert health_payload["status"] == "healthy"
    assert health_payload["database"] == "disconnected"


def test_dashboard_returns_503_when_database_is_not_initialised(test_client):
    """
    Verifies dashboard route handles repository runtime errors gracefully.
    """
    database_manager.database = None
    dashboard_response = test_client.get("/")
    assert dashboard_response.status_code == 503
    assert "Workout Dashboard" in dashboard_response.data.decode("utf-8")


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
