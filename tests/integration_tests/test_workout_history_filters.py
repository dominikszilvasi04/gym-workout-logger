"""
Integration tests for workout history filtering and pagination endpoint.
"""


def test_workout_history_filters_by_date_and_exercise_name(test_client):
    """
    Verifies /api/workouts supports date window and exercise name filters.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "History Filter User",
            "email": "history.filter@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )

    test_client.post(
        "/api/workouts",
        json={
            "date_of_workout": "2026-03-01T09:00",
            "target_muscle_groups": ["Chest"],
            "session_tags": ["Strength"],
            "exercises": [
                {
                    "exercise_name": "Bench Press",
                    "exercise_definition_identifier": "bench-001",
                    "sets": [
                        {
                            "repetitions": 5,
                            "weight_in_kilograms": 100.0,
                            "rate_of_perceived_exertion": 8,
                        }
                    ],
                }
            ],
        },
    )

    test_client.post(
        "/api/workouts",
        json={
            "date_of_workout": "2026-03-15T09:00",
            "target_muscle_groups": ["Legs"],
            "session_tags": ["Volume"],
            "exercises": [
                {
                    "exercise_name": "Back Squat",
                    "exercise_definition_identifier": "squat-001",
                    "sets": [
                        {
                            "repetitions": 5,
                            "weight_in_kilograms": 120.0,
                            "rate_of_perceived_exertion": 9,
                        }
                    ],
                }
            ],
        },
    )

    filtered_response = test_client.get(
        "/api/workouts?start_date=2026-03-01&end_date=2026-03-10&exercise_name=bench"
    )
    assert filtered_response.status_code == 200

    payload = filtered_response.get_json()
    assert payload["total"] == 1
    assert len(payload["workouts"]) == 1
    assert payload["workouts"][0]["exercises"][0]["exercise_name"] == "Bench Press"


def test_workout_history_supports_muscle_tag_filters_and_pagination(test_client):
    """
    Verifies /api/workouts supports target muscle, session tag, and paging metadata.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "History Page User",
            "email": "history.page@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )

    for index in range(3):
        create_response = test_client.post(
            "/api/workouts",
            json={
                "date_of_workout": f"2026-04-0{index + 1}T09:00",
                "target_muscle_groups": ["Back", "Biceps"],
                "session_tags": ["Deload"],
                "exercises": [
                    {
                        "exercise_name": "Barbell Row",
                        "exercise_definition_identifier": "row-001",
                        "sets": [
                            {
                                "repetitions": 8,
                                "weight_in_kilograms": 70.0 + index,
                                "rate_of_perceived_exertion": 7,
                            }
                        ],
                    }
                ],
            },
        )
        assert create_response.status_code == 201

    page_one_response = test_client.get(
        "/api/workouts?target_muscle_group=back&session_tag=deload&limit=2&page=1"
    )
    assert page_one_response.status_code == 200
    page_one_payload = page_one_response.get_json()

    assert page_one_payload["total"] == 3
    assert page_one_payload["total_pages"] == 2
    assert page_one_payload["page"] == 1
    assert page_one_payload["limit"] == 2
    assert len(page_one_payload["workouts"]) == 2

    page_two_response = test_client.get(
        "/api/workouts?target_muscle_group=back&session_tag=deload&limit=2&page=2"
    )
    assert page_two_response.status_code == 200
    page_two_payload = page_two_response.get_json()

    assert page_two_payload["total"] == 3
    assert page_two_payload["total_pages"] == 2
    assert page_two_payload["page"] == 2
    assert len(page_two_payload["workouts"]) == 1
