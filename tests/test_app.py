from copy import deepcopy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

import src.app as app_module

# Guardar snapshot inicial para resetear entre tests
INITIAL_ACTIVITIES = deepcopy(app_module.activities)


@pytest.fixture(autouse=True)
def reset_activities():
    # Resetear el estado global antes de cada test
    app_module.activities = deepcopy(INITIAL_ACTIVITIES)


@pytest.fixture
def client():
    with TestClient(app_module.app) as c:
        yield c


def test_get_activities(client):
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_success(client):
    email = "testuser@example.com"
    r = client.post(f"/activities/{quote('Soccer Team')}/signup?email={quote(email)}")
    assert r.status_code == 200
    assert "Signed up" in r.json().get("message", "")

    r2 = client.get("/activities")
    assert email in r2.json()["Soccer Team"]["participants"]


def test_signup_duplicate(client):
    email = "dupe@example.com"
    r = client.post(f"/activities/{quote('Painting Workshop')}/signup?email={quote(email)}")
    assert r.status_code == 200

    r2 = client.post(f"/activities/{quote('Painting Workshop')}/signup?email={quote(email)}")
    assert r2.status_code == 400
    assert r2.json().get("detail") == "Student already signed up for this activity"


def test_remove_participant_success(client):
    email = "michael@mergington.edu"
    r = client.delete(f"/activities/{quote('Chess Club')}/signup?email={quote(email)}")
    assert r.status_code == 200
    assert "Removed" in r.json().get("message", "")

    r2 = client.get("/activities")
    assert email not in r2.json()["Chess Club"]["participants"]


def test_remove_participant_not_signed(client):
    email = "not@signed.com"
    r = client.delete(f"/activities/{quote('Chess Club')}/signup?email={quote(email)}")
    assert r.status_code == 400
    assert r.json().get("detail") == "Student not signed up for this activity"
