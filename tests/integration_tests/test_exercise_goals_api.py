"""
Integration tests for exercise goal API and progress calculation.
"""


def test_exercise_goals_require_authentication(test_client):
    """
    Verifies unauthenticated requests cannot access goal endpoints.
    """
    response = test_client.get("/api/goals")
    assert response.status_code == 401
    assert response.get_json()["error"] == "Authentication required."


def test_create_and_list_exercise_goals_with_progress(test_client):
    """
    Verifies goal creation and computed progress values based on logged workouts.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "Goals User",
            "email": "goals.user@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )

    create_goal_response = test_client.post(
        "/api/goals",
        json={
            "exercise_name": "Bench Press",
            "target_weight_in_kilograms": 100.0,
            "target_repetitions": 5,
            "target_date": "2026-12-31",
        },
    )
    assert create_goal_response.status_code == 201

    workout_response = test_client.post(
        "/api/workouts",
        json={
            "date_of_workout": "2026-03-01T09:00",
            "target_muscle_groups": ["Chest"],
            "exercises": [
                {
                    "exercise_name": "Bench Press",
                    "exercise_definition_identifier": "bench-001",
                    "sets": [
                        {
                            "repetitions": 3,
                            "weight_in_kilograms": 110.0,
                            "rate_of_perceived_exertion": 9,
                        }
                    ],
                }
            ],
        },
    )
    assert workout_response.status_code == 201

    list_response = test_client.get("/api/goals")
    assert list_response.status_code == 200

    goals = list_response.get_json()
    assert len(goals) == 1
    goal = goals[0]
    assert goal["exercise_name"] == "Bench Press"
    assert goal["target_estimated_one_rep_maximum"] == 116.67
    assert goal["current_best_estimated_one_rep_maximum"] == 121.0
    assert goal["is_achieved"] is True
    assert goal["progress_percentage"] >= 100.0


def test_delete_exercise_goal(test_client):
    """
    Verifies goals can be deleted and no longer returned in listing.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "Goals Delete User",
            "email": "goals.delete@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )

    create_goal_response = test_client.post(
        "/api/goals",
        json={
            "exercise_name": "Back Squat",
            "target_weight_in_kilograms": 140.0,
            "target_repetitions": 3,
        },
    )
    assert create_goal_response.status_code == 201

    goal_identifier = create_goal_response.get_json()["identifier"]

    delete_response = test_client.delete(f"/api/goals/{goal_identifier}")
    assert delete_response.status_code == 200

    list_response = test_client.get("/api/goals")
    assert list_response.status_code == 200
    assert list_response.get_json() == []
