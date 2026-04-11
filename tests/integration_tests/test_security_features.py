"""
Integration tests for security middleware and protections.
"""
from typing import Iterator
import pytest
from flask import Flask
from flask.testing import FlaskClient
from application import create_application
from application.configuration import TestingConfiguration
from application.security import limiter


class CsrfEnabledTestingConfiguration(TestingConfiguration):
    """
    Testing config variant with CSRF enabled for dedicated security tests.
    """
    CSRF_PROTECTION_ENABLED: bool = True


class StrictRateLimitTestingConfiguration(TestingConfiguration):
    """
    Testing config variant with strict global limit to verify throttling.
    """
    RATELIMIT_DEFAULT: str = "2 per minute"


@pytest.fixture
def csrf_enabled_application() -> Iterator[Flask]:
    """
    Provides an application instance with CSRF validation enabled.
    """
    application_instance = create_application(configuration_class=CsrfEnabledTestingConfiguration)
    yield application_instance


@pytest.fixture
def csrf_enabled_client(csrf_enabled_application: Flask) -> FlaskClient:
    """
    Provides a client bound to the CSRF-enabled application instance.
    """
    return csrf_enabled_application.test_client()


@pytest.fixture
def strict_rate_limit_application() -> Iterator[Flask]:
    """
    Provides an application instance with a strict default rate limit.
    """
    application_instance = create_application(configuration_class=StrictRateLimitTestingConfiguration)

    @application_instance.route("/security_rate_limit_probe", methods=["GET"])
    @limiter.limit("2 per minute")
    def security_rate_limit_probe() -> dict[str, str]:
        return {"status": "ok"}

    yield application_instance


@pytest.fixture
def strict_rate_limit_client(strict_rate_limit_application: Flask) -> FlaskClient:
    """
    Provides a client bound to the strict-limit application instance.
    """
    return strict_rate_limit_application.test_client()


def extract_session_csrf_token(client: FlaskClient) -> str:
    """
    Retrieves CSRF token using the dedicated API endpoint.
    """
    csrf_response = client.get("/api/auth/csrf")
    assert csrf_response.status_code == 200
    return csrf_response.get_json()["csrf_token"]


def test_security_headers_are_applied_to_responses(test_client: FlaskClient):
    """
    Verifies common hardening headers are added to responses.
    """
    response = test_client.get("/health_check")

    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert response.headers["Permissions-Policy"] == "geolocation=(), microphone=(), camera=()"
    assert "Content-Security-Policy" in response.headers


def test_register_rejects_missing_csrf_token_when_protection_enabled(csrf_enabled_client: FlaskClient):
    """
    Verifies form POST requests fail when CSRF token is missing.
    """
    registration_response = csrf_enabled_client.post(
        "/register",
        data={
            "display_name": "CSRF User",
            "email": "csrf.missing@example.com",
            "password": "securepass123",
        },
        follow_redirects=False,
    )

    assert registration_response.status_code == 400
    assert b"CSRF validation failed." in registration_response.data


def test_register_accepts_valid_csrf_token_when_protection_enabled(csrf_enabled_client: FlaskClient):
    """
    Verifies form POST requests succeed when a valid CSRF token is supplied.
    """
    csrf_token = extract_session_csrf_token(csrf_enabled_client)

    registration_response = csrf_enabled_client.post(
        "/register",
        data={
            "display_name": "CSRF User",
            "email": "csrf.valid@example.com",
            "password": "securepass123",
            "csrf_token": csrf_token,
        },
        follow_redirects=False,
    )

    assert registration_response.status_code == 302


def test_api_write_rejects_missing_csrf_header_when_protection_enabled(csrf_enabled_client: FlaskClient):
    """
    Verifies state-changing API requests fail without the CSRF request header.
    """
    registration_csrf_token = extract_session_csrf_token(csrf_enabled_client)
    register_response = csrf_enabled_client.post(
        "/register",
        data={
            "display_name": "API CSRF User",
            "email": "csrf.api@example.com",
            "password": "securepass123",
            "csrf_token": registration_csrf_token,
        },
        follow_redirects=False,
    )
    assert register_response.status_code == 302

    missing_header_response = csrf_enabled_client.post(
        "/api/workouts",
        json={
            "target_muscle_groups": ["Chest"],
            "exercises": [
                {
                    "exercise_name": "Bench Press",
                    "exercise_definition_identifier": "bench-001",
                    "sets": [
                        {
                            "repetitions": 5,
                            "weight_in_kilograms": 100.0,
                            "rate_of_perceived_exertion": 9,
                        }
                    ],
                }
            ],
        },
    )
    assert missing_header_response.status_code == 400
    assert missing_header_response.get_json()["error"] == "CSRF validation failed."



def test_api_write_accepts_valid_csrf_header_when_protection_enabled(csrf_enabled_client: FlaskClient):
    """
    Verifies state-changing API requests succeed with a valid CSRF request header.
    """
    registration_csrf_token = extract_session_csrf_token(csrf_enabled_client)
    register_response = csrf_enabled_client.post(
        "/register",
        data={
            "display_name": "API CSRF Success",
            "email": "csrf.api.success@example.com",
            "password": "securepass123",
            "csrf_token": registration_csrf_token,
        },
        follow_redirects=False,
    )
    assert register_response.status_code == 302

    csrf_enabled_client.get("/")
    with csrf_enabled_client.session_transaction() as browser_session:
        api_csrf_token = browser_session["csrf_token"]

    create_response = csrf_enabled_client.post(
        "/api/workouts",
        json={
            "target_muscle_groups": ["Chest"],
            "exercises": [
                {
                    "exercise_name": "Bench Press",
                    "exercise_definition_identifier": "bench-001",
                    "sets": [
                        {
                            "repetitions": 5,
                            "weight_in_kilograms": 100.0,
                            "rate_of_perceived_exertion": 9,
                        }
                    ],
                }
            ],
        },
        headers={"X-CSRF-Token": api_csrf_token},
    )

    assert create_response.status_code == 201


def test_rate_limiting_returns_429_when_limit_is_exceeded(strict_rate_limit_client: FlaskClient):
    """
    Verifies the global limiter blocks excessive traffic with HTTP 429.
    """
    first_response = strict_rate_limit_client.get("/security_rate_limit_probe")
    second_response = strict_rate_limit_client.get("/security_rate_limit_probe")
    throttled_response = strict_rate_limit_client.get("/security_rate_limit_probe")

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert throttled_response.status_code == 429
