"""
Integration tests for workout notes and session tags.
"""


def test_create_workout_persists_notes_and_tags(test_client):
    """
    Verifies notes and tags are accepted on create and returned on detail fetch.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "Notes Create User",
            "email": "notes.create@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )

    creation_payload = {
        "target_muscle_groups": ["Legs"],
        "session_tags": ["Strength", "Morning"],
        "workout_notes": "Felt strong after extra sleep.",
        "exercises": [
            {
                "exercise_name": "Back Squat",
                "exercise_definition_identifier": "squat-001",
                "sets": [
                    {
                        "repetitions": 5,
                        "weight_in_kilograms": 120.0,
                        "rate_of_perceived_exertion": 8,
                    }
                ],
            }
        ],
    }

    creation_response = test_client.post("/api/workouts", json=creation_payload)
    assert creation_response.status_code == 201

    workout_identifier = creation_response.get_json()["identifier"]
    detail_response = test_client.get(f"/api/workouts/{workout_identifier}")
    assert detail_response.status_code == 200

    detail_payload = detail_response.get_json()
    assert detail_payload["session_tags"] == ["Strength", "Morning"]
    assert detail_payload["workout_notes"] == "Felt strong after extra sleep."


def test_update_workout_allows_notes_and_tags(test_client):
    """
    Verifies notes and tags are persisted when an existing workout is updated.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "Notes Update User",
            "email": "notes.update@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )

    creation_response = test_client.post(
        "/api/workouts",
        json={
            "target_muscle_groups": ["Back"],
            "exercises": [
                {
                    "exercise_name": "Barbell Row",
                    "exercise_definition_identifier": "row-001",
                    "sets": [
                        {
                            "repetitions": 8,
                            "weight_in_kilograms": 70.0,
                            "rate_of_perceived_exertion": 7,
                        }
                    ],
                }
            ],
        },
    )
    assert creation_response.status_code == 201
    workout_identifier = creation_response.get_json()["identifier"]

    update_response = test_client.put(
        f"/api/workouts/{workout_identifier}",
        json={
            "target_muscle_groups": ["Back", "Biceps"],
            "session_tags": ["Deload", "Technique"],
            "workout_notes": "Kept loads lighter and focused on tempo.",
            "exercises": [
                {
                    "exercise_name": "Barbell Row",
                    "exercise_definition_identifier": "row-001",
                    "sets": [
                        {
                            "repetitions": 10,
                            "weight_in_kilograms": 60.0,
                            "rate_of_perceived_exertion": 6,
                        }
                    ],
                }
            ],
        },
    )
    assert update_response.status_code == 200

    detail_response = test_client.get(f"/api/workouts/{workout_identifier}")
    assert detail_response.status_code == 200

    detail_payload = detail_response.get_json()
    assert detail_payload["target_muscle_groups"] == ["Back", "Biceps"]
    assert detail_payload["session_tags"] == ["Deload", "Technique"]
    assert detail_payload["workout_notes"] == "Kept loads lighter and focused on tempo."
