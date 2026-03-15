"""
Integration tests for authentication and workout ownership scoping.
"""
from bson.objectid import ObjectId
from application.database import database_manager


def test_register_login_and_workout_owner_assignment(test_client):
    """
    Registers a user and verifies newly created workouts are tagged with that user.
    """
    registration_response = test_client.post(
        "/register",
        data={
            "display_name": "Domin",
            "email": "domin@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )
    assert registration_response.status_code == 200

    create_response = test_client.post(
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
                            "rate_of_perceived_exertion": 8,
                        }
                    ],
                }
            ],
        },
    )

    assert create_response.status_code == 201
    created_identifier = create_response.get_json()["identifier"]

    saved_document = database_manager.database["workouts"].find_one({"_id": ObjectId(created_identifier)})
    assert saved_document is not None
    assert "user_identifier" in saved_document
    assert saved_document["user_identifier"] is not None


def test_multi_tenant_user_cannot_access_other_users_workout(test_client):
    """
    Verifies workout detail endpoint is scoped to the authenticated account.
    """
    # Register user one and create a workout
    test_client.post(
        "/register",
        data={
            "display_name": "User One",
            "email": "user.one@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )

    user_one_workout_response = test_client.post(
        "/api/workouts",
        json={
            "target_muscle_groups": ["Legs"],
            "exercises": [
                {
                    "exercise_name": "Squat",
                    "exercise_definition_identifier": "squat-001",
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
    assert user_one_workout_response.status_code == 201
    user_one_workout_identifier = user_one_workout_response.get_json()["identifier"]

    # Logout user one
    test_client.post("/logout", follow_redirects=True)

    # Register user two
    test_client.post(
        "/register",
        data={
            "display_name": "User Two",
            "email": "user.two@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )

    # User two must not access user one's workout
    forbidden_detail_response = test_client.get(f"/workouts/{user_one_workout_identifier}")
    assert forbidden_detail_response.status_code == 404


def test_profile_requires_authenticated_user(test_client):
    """
    Verifies the profile page redirects anonymous users to login.
    """
    profile_response = test_client.get("/profile", follow_redirects=False)

    assert profile_response.status_code == 302
    assert "/login" in profile_response.headers["Location"]


def test_profile_page_shows_logged_in_user_statistics(test_client):
    """
    Verifies the profile page displays only the authenticated user's summary.
    """
    test_client.post(
        "/register",
        data={
            "display_name": "Profile User",
            "email": "profile.user@example.com",
            "password": "securepass123",
        },
        follow_redirects=True,
    )

    first_workout_response = test_client.post(
        "/api/workouts",
        json={
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
        },
    )
    assert first_workout_response.status_code == 201

    second_workout_response = test_client.post(
        "/api/workouts",
        json={
            "target_muscle_groups": ["Chest"],
            "exercises": [
                {
                    "exercise_name": "Incline Dumbbell Press",
                    "exercise_definition_identifier": "incline-001",
                    "sets": [
                        {
                            "repetitions": 10,
                            "weight_in_kilograms": 30.0,
                            "rate_of_perceived_exertion": 8,
                        }
                    ],
                }
            ],
        },
    )
    assert second_workout_response.status_code == 201

    profile_response = test_client.get("/profile")

    assert profile_response.status_code == 200
    profile_page_content = profile_response.data.decode("utf-8")
    assert "Your Profile" in profile_page_content
    assert "Profile User" in profile_page_content
    assert "Total Workouts" in profile_page_content
    assert "2" in profile_page_content
    assert "1450.00 kg" in profile_page_content
    assert "Chest" in profile_page_content
    assert "Recent Workouts" in profile_page_content
