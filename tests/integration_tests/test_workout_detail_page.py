"""
Integration tests for the dedicated workout detail page.
"""


def test_view_workout_detail_page_shows_exercises_and_sets(test_client):
    """
    Creates a workout via API and verifies its detail page renders core data.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "Detail User",
            "email": "detail.user@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )

    creation_payload = {
        "target_muscle_groups": ["Chest", "Triceps"],
        "exercises": [
            {
                "exercise_name": "Bench Press",
                "exercise_definition_identifier": "bench-001",
                "sets": [
                    {
                        "repetitions": 8,
                        "weight_in_kilograms": 80.0,
                        "rate_of_perceived_exertion": 8,
                    },
                    {
                        "repetitions": 6,
                        "weight_in_kilograms": 85.0,
                        "rate_of_perceived_exertion": 9,
                    },
                ],
            }
        ],
    }

    creation_response = test_client.post("/api/workouts", json=creation_payload)
    assert creation_response.status_code == 201

    workout_identifier = creation_response.get_json()["identifier"]
    detail_response = test_client.get(f"/workouts/{workout_identifier}")

    assert detail_response.status_code == 200
    detail_page_content = detail_response.data.decode("utf-8")
    assert "Workout Session" in detail_page_content
    assert "Bench Press" in detail_page_content
    assert "Delete Workout" in detail_page_content
    assert "Edit Workout" in detail_page_content
    assert "Total Session Volume:" in detail_page_content
    assert "1150.00 kg" in detail_page_content


def test_view_workout_detail_page_returns_404_for_missing_workout(test_client):
    """
    Verifies missing workout identifiers return a proper 404 response.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "Detail Missing User",
            "email": "detail.missing@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )

    missing_response = test_client.get("/workouts/this-id-does-not-exist")
    assert missing_response.status_code == 404


def test_workout_detail_page_requires_login(test_client):
    """
    Verifies protected workout detail routes redirect unauthenticated users.
    """
    unauthenticated_response = test_client.get("/workouts/any-id", follow_redirects=False)
    assert unauthenticated_response.status_code == 302
    assert "/login" in unauthenticated_response.headers["Location"]
