"""
Integration tests for admin endpoints to improve admin_controller coverage.
"""


def test_admin_api_users_endpoint_requires_admin(test_client):
    """Test that /api/admin/users requires admin role."""
    response = test_client.get("/api/admin/users", follow_redirects=False)
    assert response.status_code in [403, 401, 302]


def test_non_admin_cannot_delete_user(test_client):
    """Test that non-admin users cannot delete users."""
    # Register user
    test_client.post(
        "/register",
        data={
            "display_name": "Regular User",
            "email": "regular@example.com",
            "password": "password123",
        },
        follow_redirects=True,
    )

    response = test_client.delete("/api/admin/users/some-id", follow_redirects=False)
    assert response.status_code in [403, 401, 404]


def test_protected_admin_endpoints(test_client):
    """Test that various admin endpoints require authentication."""
    endpoints = [
        ("/api/admin/users", "GET"),
        ("/api/admin/export", "GET"),
        ("/api/admin/audit-logs", "GET"),
    ]

    for endpoint, method in endpoints:
        if method == "GET":
            response = test_client.get(endpoint, follow_redirects=False)
        elif method == "POST":
            response = test_client.post(endpoint, follow_redirects=False)
        elif method == "DELETE":
            response = test_client.delete(endpoint, follow_redirects=False)

        # Unauth should get 401 or 403 or redirected
        assert response.status_code in [401, 403, 302, 404], f"Endpoint {endpoint} not protected"


def test_csrf_token_endpoint(test_client):
    """Test that CSRF token endpoint is accessible."""
    response = test_client.get("/api/auth/csrf", follow_redirects=False)
    assert response.status_code == 200
    data = response.get_json()
    assert "csrf_token" in data


def test_audit_logs_requires_authentication(test_client):
    """Test that audit logs endpoint requires authentication."""
    response = test_client.get("/api/admin/audit-logs", follow_redirects=False)
    assert response.status_code in [401, 403]


def test_export_requires_authentication(test_client):
    """Test that export endpoint requires authentication."""
    response = test_client.get("/api/admin/export", follow_redirects=False)
    assert response.status_code in [401, 403]
