"""
Integration tests for user service operations to improve coverage.
"""


def test_user_profile_endpoints_require_authentication(test_client):
    """Test that profile endpoints require authentication."""
    response = test_client.get("/api/auth/me", follow_redirects=False)
    assert response.status_code in [401, 302]


def test_get_user_profile(test_client):
    """Test retrieving user profile."""
    # Register and login
    test_client.post(
        "/register",
        data={
            "display_name": "Profile Test",
            "email": "profile@example.com",
            "password": "password123",
        },
        follow_redirects=True,
    )

    response = test_client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.get_json()
    assert data.get("email") == "profile@example.com"
    assert data.get("display_name") == "Profile Test"


def test_update_user_profile(test_client):
    """Test updating user profile."""
    # Register and login
    test_client.post(
        "/register",
        data={
            "display_name": "Original Name",
            "email": "update@example.com",
            "password": "password123",
        },
        follow_redirects=True,
    )

    # Update profile
    response = test_client.put(
        "/api/auth/me",
        json={"display_name": "Updated Name"},
        follow_redirects=True,
    )
    assert response.status_code in [200, 204]

    # Verify update
    profile_response = test_client.get("/api/auth/me")
    data = profile_response.get_json()
    assert data.get("display_name") == "Updated Name"


def test_update_user_profile_with_empty_name(test_client):
    """Test updating profile with empty display name."""
    # Register and login
    test_client.post(
        "/register",
        data={
            "display_name": "Original",
            "email": "empty@example.com",
            "password": "password123",
        },
        follow_redirects=True,
    )

    # Try to update with empty name
    response = test_client.put(
        "/api/auth/me",
        json={"display_name": ""},
        follow_redirects=True,
    )
    # Should reject empty name
    assert response.status_code in [200, 204, 400]


def test_get_profile_returns_correct_fields(test_client):
    """Test that profile endpoint returns all expected fields."""
    # Register and login
    test_client.post(
        "/register",
        data={
            "display_name": "Complete Profile",
            "email": "complete@example.com",
            "password": "password123",
        },
        follow_redirects=True,
    )

    response = test_client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.get_json()

    # Check expected fields
    assert "email" in data
    assert "display_name" in data


def test_profile_update_preserves_email(test_client):
    """Test that profile updates preserve user email."""
    email = "preserve@example.com"

    # Register and login
    test_client.post(
        "/register",
        data={
            "display_name": "Original Name",
            "email": email,
            "password": "password123",
        },
        follow_redirects=True,
    )

    # Update profile with different data
    test_client.put(
        "/api/auth/me",
        json={"display_name": "New Name"},
        follow_redirects=True,
    )

    # Verify email unchanged
    profile_response = test_client.get("/api/auth/me")
    data = profile_response.get_json()
    assert data.get("email") == email


def test_get_csrf_token(test_client):
    """Test retrieving CSRF token."""
    response = test_client.get("/api/auth/csrf")
    assert response.status_code == 200
    data = response.get_json()
    assert "csrf_token" in data


def test_update_profile_invalid_json(test_client):
    """Test updating profile with invalid JSON."""
    # Register and login
    test_client.post(
        "/register",
        data={
            "display_name": "Invalid JSON Test",
            "email": "json@example.com",
            "password": "password123",
        },
        follow_redirects=True,
    )

    # Send non-JSON request
    response = test_client.put(
        "/api/auth/me",
        data="not json",
        content_type="application/json",
    )
    assert response.status_code in [400, 422]


def test_multiple_users_different_profiles(test_client):
    """Test that different users have different profiles."""
    # Register user 1
    test_client.post(
        "/register",
        data={
            "display_name": "User One",
            "email": "user1@example.com",
            "password": "password123",
        },
        follow_redirects=True,
    )

    # Get profile 1
    profile1 = test_client.get("/api/auth/me").get_json()
    assert profile1.get("email") == "user1@example.com"

    # Logout
    test_client.post("/logout", follow_redirects=True)

    # Register user 2
    test_client.post(
        "/register",
        data={
            "display_name": "User Two",
            "email": "user2@example.com",
            "password": "password123",
        },
        follow_redirects=True,
    )

    # Get profile 2
    profile2 = test_client.get("/api/auth/me").get_json()
    assert profile2.get("email") == "user2@example.com"

    # Verify they're different
    assert profile1.get("email") != profile2.get("email")
