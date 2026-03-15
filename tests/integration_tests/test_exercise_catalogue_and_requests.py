"""
Integration tests for standard exercise catalogue seeding and exercise request workflow.
"""
from application.services import application_exercise_definition_service


def test_exercise_catalogue_endpoint_returns_large_seeded_list(test_client):
    """
    Verifies exercise catalogue endpoint returns a large seeded exercise list.
    """
    exercises_response = test_client.get("/api/exercises")
    assert exercises_response.status_code == 200
    exercises_payload = exercises_response.get_json()
    assert len(exercises_payload) >= 100
    exercise_names = [exercise["exercise_name"] for exercise in exercises_payload]
    assert "Barbell Back Squat" in exercise_names
    assert "Barbell Bench Press" in exercise_names
    assert "Pull Up" in exercise_names


def test_exercise_request_endpoint_requires_authenticated_user(test_client):
    """
    Verifies anonymous users cannot submit exercise request emails.
    """
    request_response = test_client.post(
        "/api/exercises/requests",
        json={
            "requester_email": "member@example.com",
            "exercise_name": "Reverse Nordic Curl",
            "primary_muscle_group": "Legs",
            "notes": "Bodyweight movement",
        },
    )
    assert request_response.status_code == 401
    request_payload = request_response.get_json()
    assert request_payload["error"] == "Authentication required."


def test_exercise_request_endpoint_validates_payload_for_authenticated_user(test_client):
    """
    Verifies payload validation for exercise requests.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "Exercise Request User",
            "email": "exercise.request.user@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )
    invalid_response = test_client.post(
        "/api/exercises/requests",
        json={
            "requester_email": "invalid-email",
            "exercise_name": "",
            "primary_muscle_group": "",
        },
    )
    assert invalid_response.status_code == 400
    invalid_payload = invalid_response.get_json()
    assert "error" in invalid_payload


def test_exercise_request_endpoint_sends_email_when_payload_is_valid(test_client, monkeypatch):
    """
    Verifies valid requests trigger the exercise request email service.
    """
    captured_request = {}

    def fake_send_exercise_request_notification_email(
        requester_email,
        requested_exercise_name,
        requested_primary_muscle_group,
        request_notes,
        application_configuration,
    ):
        captured_request["requester_email"] = requester_email
        captured_request["requested_exercise_name"] = requested_exercise_name
        captured_request["requested_primary_muscle_group"] = requested_primary_muscle_group
        captured_request["request_notes"] = request_notes

    monkeypatch.setattr(
        application_exercise_definition_service,
        "send_exercise_request_notification_email",
        fake_send_exercise_request_notification_email,
    )

    test_client.post(
        "/register",
        data={
            "display_name": "Exercise Request Sender",
            "email": "exercise.request.sender@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )

    valid_response = test_client.post(
        "/api/exercises/requests",
        json={
            "requester_email": "exercise.request.sender@example.com",
            "exercise_name": "Reverse Nordic Curl",
            "primary_muscle_group": "Legs",
            "notes": "Useful for quad tendon strength",
        },
    )

    assert valid_response.status_code == 202
    response_payload = valid_response.get_json()
    assert response_payload["message"] == "Exercise request sent successfully."
    assert captured_request["requester_email"] == "exercise.request.sender@example.com"
    assert captured_request["requested_exercise_name"] == "Reverse Nordic Curl"
    assert captured_request["requested_primary_muscle_group"] == "Legs"
