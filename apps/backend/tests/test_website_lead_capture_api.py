"""Auth and request-shape checks for POST /api/v1/website-leads/capture.

These paths return before any database access, so they run without MongoDB
(the TestClient is not used as a context manager, so app lifespan is skipped).
"""
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

URL = "/api/v1/website-leads/capture"
client = TestClient(app)


def test_disabled_until_api_key_configured(monkeypatch):
    monkeypatch.setattr(settings, "WEBSITE_CAPTURE_API_KEY", "")
    response = client.post(URL, json={"lead": {}}, headers={"X-Api-Key": "anything"})
    assert response.status_code == 503
    assert response.json()["error"] is True


def test_rejects_missing_or_wrong_key(monkeypatch):
    monkeypatch.setattr(settings, "WEBSITE_CAPTURE_API_KEY", "right-key")
    assert client.post(URL, json={"lead": {}}).status_code == 401
    assert client.post(URL, json={"lead": {}}, headers={"X-Api-Key": "wrong"}).status_code == 401


def test_rejects_non_object_body(monkeypatch):
    monkeypatch.setattr(settings, "WEBSITE_CAPTURE_API_KEY", "right-key")
    response = client.post(URL, json=["not", "an", "object"], headers={"X-Api-Key": "right-key"})
    assert response.status_code == 400
