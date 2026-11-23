"""Tests that the browser-facing CORS settings let the frontend call the API."""

import os

from fastapi.testclient import TestClient

from main import app

ALLOWED_ORIGIN = (
    os.getenv("CORS_ORIGINS", "http://localhost:4200").split(",")[0].strip()
)

client = TestClient(app)


def preflight(origin):
    return client.options(
        "/events",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )


def test_the_frontend_origin_may_send_an_authorization_header():
    response = preflight(ALLOWED_ORIGIN)

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


def test_other_websites_are_not_allowed():
    response = preflight("https://evil.example.com")

    assert "access-control-allow-origin" not in response.headers
