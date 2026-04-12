"""
Integration tests for dashboard analytics and real chart data.
"""


def test_dashboard_analytics_requires_login(test_client):
    """
    Verifies dashboard analytics API rejects unauthenticated requests.
    """
    analytics_response = test_client.get("/api/dashboard/analytics")
    assert analytics_response.status_code == 401
    payload = analytics_response.get_json()
    assert payload["error"] == "Authentication required."


def test_dashboard_analytics_returns_real_chart_data_for_authenticated_user(test_client):
    """
    Verifies the analytics API returns real summary and chart series from saved workouts.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "Chart User",
            "email": "chart.user@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )

    first_workout_response = test_client.post(
        "/api/workouts",
        json={
            "date_of_workout": "2026-03-01T09:00",
            "target_muscle_groups": ["Chest", "Triceps"],
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
    assert first_workout_response.status_code == 201

    second_workout_response = test_client.post(
        "/api/workouts",
        json={
            "date_of_workout": "2026-03-08T09:00",
            "target_muscle_groups": ["Chest"],
            "exercises": [
                {
                    "exercise_name": "Bench Press",
                    "exercise_definition_identifier": "bench-001",
                    "sets": [
                        {
                            "repetitions": 3,
                            "weight_in_kilograms": 120.0,
                            "rate_of_perceived_exertion": 10,
                        }
                    ],
                }
            ],
        },
    )
    assert second_workout_response.status_code == 201

    analytics_response = test_client.get("/api/dashboard/analytics")
    assert analytics_response.status_code == 200

    analytics_payload = analytics_response.get_json()
    assert analytics_payload["filters"]["available_exercises"] == ["Bench Press"]
    assert analytics_payload["filters"]["selected_exercise"] is None
    assert analytics_payload["summary"]["total_workouts"] == 2
    assert analytics_payload["summary"]["total_volume"] == 860.0
    assert analytics_payload["summary"]["average_workout_volume"] == 430.0
    assert analytics_payload["summary"]["total_sets"] == 2
    assert analytics_payload["summary"]["total_repetitions"] == 8
    assert analytics_payload["summary"]["total_exercises"] == 2
    assert analytics_payload["summary"]["strongest_estimated_one_rep_maximum"] == 132.0
    assert analytics_payload["summary"]["average_session_rpe"] == 9.5
    assert analytics_payload["summary"]["current_training_streak_weeks"] == 2

    assert analytics_payload["charts"]["workout_volume_progression"]["labels"] == ["2026-03-01", "2026-03-08"]
    assert analytics_payload["charts"]["workout_volume_progression"]["values"] == [500.0, 360.0]
    assert analytics_payload["charts"]["one_rep_max_progression"]["values"] == [116.67, 132.0]
    assert analytics_payload["charts"]["muscle_group_distribution"]["labels"] == ["Chest", "Triceps"]
    assert analytics_payload["charts"]["muscle_group_distribution"]["values"] == [2, 1]
    assert analytics_payload["charts"]["weekly_frequency"]["values"] == [1, 1]
    assert analytics_payload["charts"]["average_rpe_progression"]["values"] == [9.0, 10.0]
    assert analytics_payload["charts"]["top_exercise_volume"]["labels"] == ["Bench Press"]
    assert analytics_payload["charts"]["top_exercise_volume"]["values"] == [860.0]
    assert analytics_payload["leaderboards"]["personal_records"][0]["exercise_name"] == "Bench Press"
    assert analytics_payload["leaderboards"]["personal_records"][0]["estimated_one_rep_maximum"] == 132.0



def test_dashboard_analytics_is_scoped_to_logged_in_user(test_client):
    """
    Verifies dashboard analytics only include the authenticated user's workouts.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "User One",
            "email": "analytics.one@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )
    test_client.post(
        "/api/workouts",
        json={
            "date_of_workout": "2026-03-05T09:00",
            "target_muscle_groups": ["Legs"],
            "exercises": [
                {
                    "exercise_name": "Squat",
                    "exercise_definition_identifier": "squat-001",
                    "sets": [
                        {
                            "repetitions": 5,
                            "weight_in_kilograms": 110.0,
                            "rate_of_perceived_exertion": 9,
                        }
                    ],
                }
            ],
        },
    )
    test_client.post("/logout", follow_redirects=True)

    test_client.post(
        "/register",
        data={
            "display_name": "User Two",
            "email": "analytics.two@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )
    test_client.post(
        "/api/workouts",
        json={
            "date_of_workout": "2026-03-12T09:00",
            "target_muscle_groups": ["Back"],
            "exercises": [
                {
                    "exercise_name": "Barbell Row",
                    "exercise_definition_identifier": "row-001",
                    "sets": [
                        {
                            "repetitions": 8,
                            "weight_in_kilograms": 70.0,
                            "rate_of_perceived_exertion": 8,
                        }
                    ],
                }
            ],
        },
    )

    analytics_response = test_client.get("/api/dashboard/analytics")
    assert analytics_response.status_code == 200

    analytics_payload = analytics_response.get_json()
    assert analytics_payload["summary"]["total_workouts"] == 1
    assert analytics_payload["charts"]["workout_volume_progression"]["labels"] == ["2026-03-12"]
    assert analytics_payload["charts"]["muscle_group_distribution"]["labels"] == ["Back"]


def test_dashboard_analytics_supports_exercise_specific_strength_filter(test_client):
    """
    Verifies the 1RM progression can be focused on a specific exercise.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "Filtered Charts",
            "email": "filtered.charts@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )

    test_client.post(
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
                            "repetitions": 5,
                            "weight_in_kilograms": 100.0,
                            "rate_of_perceived_exertion": 9,
                        }
                    ],
                }
            ],
        },
    )
    test_client.post(
        "/api/workouts",
        json={
            "date_of_workout": "2026-03-04T09:00",
            "target_muscle_groups": ["Back"],
            "exercises": [
                {
                    "exercise_name": "Barbell Row",
                    "exercise_definition_identifier": "row-001",
                    "sets": [
                        {
                            "repetitions": 8,
                            "weight_in_kilograms": 70.0,
                            "rate_of_perceived_exertion": 8,
                        }
                    ],
                }
            ],
        },
    )

    analytics_response = test_client.get("/api/dashboard/analytics?exercise_name=Bench%20Press")
    assert analytics_response.status_code == 200

    analytics_payload = analytics_response.get_json()
    assert analytics_payload["filters"]["selected_exercise"] == "Bench Press"
    assert analytics_payload["charts"]["one_rep_max_progression"]["labels"] == ["2026-03-01"]
    assert analytics_payload["charts"]["one_rep_max_progression"]["values"] == [116.67]


def test_dashboard_analytics_ignores_missing_rpe_entries_in_rpe_summary_and_chart(test_client):
    """
    Verifies optional RPE sets do not distort average session RPE and RPE progression charts.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "Optional RPE User",
            "email": "optional.rpe@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )

    workout_without_rpe_response = test_client.post(
        "/api/workouts",
        json={
            "date_of_workout": "2026-03-01T09:00",
            "target_muscle_groups": ["Back"],
            "exercises": [
                {
                    "exercise_name": "Barbell Row",
                    "exercise_definition_identifier": "row-001",
                    "sets": [
                        {
                            "repetitions": 8,
                            "weight_in_kilograms": 70.0,
                        }
                    ],
                }
            ],
        },
    )
    assert workout_without_rpe_response.status_code == 201

    workout_with_rpe_response = test_client.post(
        "/api/workouts",
        json={
            "date_of_workout": "2026-03-08T09:00",
            "target_muscle_groups": ["Chest"],
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
    assert workout_with_rpe_response.status_code == 201

    analytics_response = test_client.get("/api/dashboard/analytics")
    assert analytics_response.status_code == 200

    analytics_payload = analytics_response.get_json()
    assert analytics_payload["summary"]["average_session_rpe"] == 8.0
    assert analytics_payload["charts"]["average_rpe_progression"]["labels"] == ["2026-03-08"]
    assert analytics_payload["charts"]["average_rpe_progression"]["values"] == [8.0]
