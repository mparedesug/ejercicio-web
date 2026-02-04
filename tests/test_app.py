import os
import sys
import pytest

# Ensure src is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from app import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_root_redirects_to_index():
    resp = client.get("/")
    # Should redirect to static index
    assert resp.status_code in (200, 307, 308) or resp.is_redirect


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # sample known activities
    assert "Chess Club" in data


def test_signup_and_remove_participant():
    activity = "Chess Club"
    email = "test.user@example.com"

    # Ensure clean state: remove if present
    client.delete(f"/activities/{activity}/signup?email={email}")

    # Signup
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200
    assert "Signed up" in r.json().get("message", "")

    # Participant present
    r = client.get("/activities")
    assert email in r.json()[activity]["participants"]

    # Removing
    r = client.delete(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200
    assert "Removed" in r.json().get("message", "")

    # Confirm removed
    r = client.get("/activities")
    assert email not in r.json()[activity]["participants"]


def test_duplicate_signup_returns_400():
    activity = "Chess Club"
    email = "dup@example.com"

    # Ensure removed
    client.delete(f"/activities/{activity}/signup?email={email}")

    # First signup ok
    r1 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r1.status_code == 200

    # Second signup should fail
    r2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r2.status_code == 400

    # Cleanup
    client.delete(f"/activities/{activity}/signup?email={email}")


def test_nonexistent_activity_errors():
    r = client.post("/activities/NoActivity/signup?email=a@b.com")
    assert r.status_code == 404

    r = client.delete("/activities/NoActivity/signup?email=a@b.com")
    assert r.status_code == 404
