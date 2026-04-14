"""
Integration tests for workout template API lifecycle and ownership boundaries.
"""

import pytest

pytestmark = pytest.mark.integration


def register_user(test_client, email: str, display_name: str = "Template User") -> None:
    response = test_client.post(
        "/register",
        data={
            "display_name": display_name,
            "email": email,
            "password": "securepass123",
        },
        follow_redirects=True,
    )
    assert response.status_code == 200


def template_payload(template_name: str = "Push Day") -> dict:
    return {
        "template_name": template_name,
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
                    }
                ],
            }
        ],
    }


def test_template_endpoints_require_authenticated_user(test_client):
    list_response = test_client.get("/api/workout-templates")
    create_response = test_client.post("/api/workout-templates", json=template_payload())

    assert list_response.status_code == 401
    assert create_response.status_code == 401
    assert list_response.get_json()["error"] == "Authentication required."


def test_create_list_get_update_delete_template_lifecycle(test_client):
    register_user(test_client, "template.flow@example.com")

    create_response = test_client.post(
        "/api/workout-templates", json=template_payload("Strength Push")
    )
    assert create_response.status_code == 201
    created_identifier = create_response.get_json()["identifier"]

    list_response = test_client.get("/api/workout-templates")
    assert list_response.status_code == 200
    templates = list_response.get_json()
    assert len(templates) == 1
    assert templates[0]["template_name"] == "Strength Push"

    get_response = test_client.get(f"/api/workout-templates/{created_identifier}")
    assert get_response.status_code == 200
    fetched_template = get_response.get_json()
    assert fetched_template["_id"] == created_identifier
    assert fetched_template["template_name"] == "Strength Push"

    update_payload = template_payload("Power Push")
    update_response = test_client.put(
        f"/api/workout-templates/{created_identifier}", json=update_payload
    )
    assert update_response.status_code == 200

    verify_response = test_client.get(f"/api/workout-templates/{created_identifier}")
    assert verify_response.status_code == 200
    assert verify_response.get_json()["template_name"] == "Power Push"

    delete_response = test_client.delete(f"/api/workout-templates/{created_identifier}")
    assert delete_response.status_code == 200

    not_found_after_delete = test_client.get(f"/api/workout-templates/{created_identifier}")
    assert not_found_after_delete.status_code == 404


def test_template_update_rejects_invalid_payload(test_client):
    register_user(test_client, "template.validation@example.com")

    create_response = test_client.post("/api/workout-templates", json=template_payload())
    assert create_response.status_code == 201
    created_identifier = create_response.get_json()["identifier"]

    invalid_payload = {
        "template_name": "",
        "target_muscle_groups": ["Back"],
        "exercises": [],
    }
    invalid_response = test_client.put(
        f"/api/workout-templates/{created_identifier}", json=invalid_payload
    )
    assert invalid_response.status_code == 422
    assert "error" in invalid_response.get_json()


def test_user_cannot_access_or_delete_other_users_template(test_client):
    register_user(test_client, "template.owner.one@example.com", display_name="Owner One")
    create_response = test_client.post(
        "/api/workout-templates", json=template_payload("Owner One Template")
    )
    assert create_response.status_code == 201
    template_identifier = create_response.get_json()["identifier"]

    test_client.post("/logout", follow_redirects=True)
    register_user(test_client, "template.owner.two@example.com", display_name="Owner Two")

    access_response = test_client.get(f"/api/workout-templates/{template_identifier}")
    delete_response = test_client.delete(f"/api/workout-templates/{template_identifier}")
    update_response = test_client.put(
        f"/api/workout-templates/{template_identifier}",
        json=template_payload("Hijack Attempt"),
    )

    assert access_response.status_code == 404
    assert delete_response.status_code == 404
    assert update_response.status_code == 404
