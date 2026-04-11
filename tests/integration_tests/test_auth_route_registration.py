"""
Integration tests for authentication route registration integrity.
"""
import pytest

pytestmark = pytest.mark.integration


def test_google_auth_routes_are_registered_once(test_application):
    """
    Guards against duplicate route declarations causing endpoint collisions.
    """
    all_rules = list(test_application.url_map.iter_rules())

    login_google_rules = [
        rule for rule in all_rules if rule.endpoint == "auth_controller.login_with_google"
    ]
    callback_rules = [
        rule for rule in all_rules if rule.endpoint == "auth_controller.google_oauth_callback"
    ]

    assert len(login_google_rules) == 1
    assert len(callback_rules) == 1
    assert login_google_rules[0].rule == "/login/google"
    assert callback_rules[0].rule == "/auth/google/callback"
