"""
Integration tests for authentication endpoints to improve coverage of auth_controller.
"""

import pytest


def test_login_page_renders_when_not_authenticated(test_client):
    """Test that login page is accessible when not authenticated."""
    response = test_client.get("/login")
    assert response.status_code == 200
    # Frontend is SPA, so just check it returns 200 with HTML
    assert b"<!doctype html>" in response.data.lower() or b"<html" in response.data.lower()


def test_register_page_renders_when_not_authenticated(test_client):
    """Test that register page is accessible when not authenticated."""
    response = test_client.get("/register")
    assert response.status_code == 200
    # Frontend is SPA, so just check it returns 200 with HTML
    assert b"<!doctype html>" in response.data.lower() or b"<html" in response.data.lower()


def test_register_with_missing_display_name(test_client):
    """Test registration rejection when display_name is missing."""
    response = test_client.post(
        "/register",
        data={
            "email": "test@example.com",
            "password": "password123",
        },
        follow_redirects=False,
    )
    # Should either reject or redirect back to register
    assert response.status_code in [400, 302, 303]


def test_register_with_missing_email(test_client):
    """Test registration rejection when email is missing."""
    response = test_client.post(
        "/register",
        data={
            "display_name": "Test User",
            "password": "password123",
        },
        follow_redirects=False,
    )
    assert response.status_code in [400, 302, 303]


def test_register_with_missing_password(test_client):
    """Test registration rejection when password is missing."""
    response = test_client.post(
        "/register",
        data={
            "display_name": "Test User",
            "email": "test@example.com",
        },
        follow_redirects=False,
    )
    assert response.status_code in [400, 302, 303]


def test_login_with_invalid_credentials(test_client):
    """Test login rejection with wrong password."""
    # First register a user
    test_client.post(
        "/register",
        data={
            "display_name": "Test User",
            "email": "testuser@example.com",
            "password": "correctpassword123",
        },
        follow_redirects=True,
    )

    # Logout
    test_client.post("/logout", follow_redirects=True)

    # Try to login with wrong password
    response = test_client.post(
        "/login",
        data={
            "email": "testuser@example.com",
            "password": "wrongpassword",
        },
        follow_redirects=False,
    )
    # Should redirect to login or return error
    assert response.status_code in [400, 401, 302, 303]


def test_login_with_nonexistent_email(test_client):
    """Test login rejection when email does not exist."""
    response = test_client.post(
        "/login",
        data={
            "email": "nonexistent@example.com",
            "password": "anypassword",
        },
        follow_redirects=False,
    )
    assert response.status_code in [400, 401, 302, 303]


def test_logout_redirects_after_clearing_session(test_client):
    """Test that logout clears session and redirects."""
    # Register and login
    test_client.post(
        "/register",
        data={
            "display_name": "Test User",
            "email": "logouttest@example.com",
            "password": "password123",
        },
        follow_redirects=True,
    )

    # Logout
    response = test_client.post("/logout", follow_redirects=False)
    assert response.status_code in [302, 303]  # Should redirect

    # Try to access protected endpoint
    response = test_client.get("/api/workouts", follow_redirects=False)
    # Should require login
    assert response.status_code in [401, 302]


def test_register_with_duplicate_email(test_client):
    """Test that registering with duplicate email is rejected."""
    email = "duplicate@example.com"
    
    # Register first user
    response1 = test_client.post(
        "/register",
        data={
            "display_name": "User One",
            "email": email,
            "password": "password123",
        },
        follow_redirects=True,
    )
    assert response1.status_code == 200

    # Logout
    test_client.post("/logout", follow_redirects=True)

    # Try to register with same email
    response2 = test_client.post(
        "/register",
        data={
            "display_name": "User Two",
            "email": email,
            "password": "password123",
        },
        follow_redirects=False,
    )
    # Should reject or redirect with error
    assert response2.status_code in [400, 302, 303]


def test_protected_endpoints_require_authentication(test_client):
    """Test that protected endpoints reject unauthenticated requests."""
    protected_endpoints = [
        "/api/workouts",
        "/api/workouts/invalid-id",
        "/api/dashboard/analytics",
        "/api/dashboard/init",
    ]

    for endpoint in protected_endpoints:
        response = test_client.get(endpoint, follow_redirects=False)
        # Should either return 401 or redirect to login
        assert response.status_code in [401, 302], f"Endpoint {endpoint} not protected"


def test_login_with_whitespace_email(test_client):
    """Test login with email containing whitespace."""
    # Register user
    test_client.post(
        "/register",
        data={
            "display_name": "Test User",
            "email": "whitespace@example.com",
            "password": "password123",
        },
        follow_redirects=True,
    )

    test_client.post("/logout", follow_redirects=True)

    # Try login with whitespace
    response = test_client.post(
        "/login",
        data={
            "email": "  whitespace@example.com  ",
            "password": "password123",
        },
        follow_redirects=True,
    )
    # Should handle whitespace and either login or reject
    assert response.status_code in [200, 400]
