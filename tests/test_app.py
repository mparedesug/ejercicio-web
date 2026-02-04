"""Tests for the Mergington High School Activities API."""

from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from app import app

client = TestClient(app)


class TestRootEndpoint:
    """Test the root endpoint."""

    def test_root_redirect(self):
        """Test that root endpoint redirects to static/index.html."""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 307
        assert response.headers["location"] == "/static/index.html"


class TestActivitiesGetEndpoint:
    """Test the GET /activities endpoint."""

    def test_get_activities(self):
        """Test retrieving all activities."""
        response = client.get("/activities")
        assert response.status_code == 200
        
        activities = response.json()
        assert isinstance(activities, dict)
        assert "Chess Club" in activities
        assert "Programming Class" in activities
        assert "Gym Class" in activities

    def test_activities_have_required_fields(self):
        """Test that activities have all required fields."""
        response = client.get("/activities")
        activities = response.json()
        
        for activity_name, activity_data in activities.items():
            assert "description" in activity_data
            assert "schedule" in activity_data
            assert "max_participants" in activity_data
            assert "participants" in activity_data
            assert isinstance(activity_data["participants"], list)

    def test_chess_club_initial_participants(self):
        """Test Chess Club has expected initial participants."""
        response = client.get("/activities")
        activities = response.json()
        
        chess_club = activities["Chess Club"]
        assert "michael@mergington.edu" in chess_club["participants"]
        assert "daniel@mergington.edu" in chess_club["participants"]
        assert len(chess_club["participants"]) == 2


class TestSignupEndpoint:
    """Test the POST /activities/{activity_name}/signup endpoint."""

    def test_signup_new_participant(self):
        """Test signing up a new participant for an activity."""
        response = client.post(
            "/activities/Basketball Team/signup",
            params={"email": "student@mergington.edu"}
        )
        
        assert response.status_code == 200
        assert "signed up" in response.json()["message"].lower()
        
        # Verify participant was added
        activities_response = client.get("/activities")
        activities = activities_response.json()
        assert "student@mergington.edu" in activities["Basketball Team"]["participants"]

    def test_signup_duplicate_participant(self):
        """Test that signing up twice returns error."""
        email = "duplicate@mergington.edu"
        
        # First signup should succeed
        response1 = client.post(
            "/activities/Soccer Club/signup",
            params={"email": email}
        )
        assert response1.status_code == 200
        
        # Second signup should fail
        response2 = client.post(
            "/activities/Soccer Club/signup",
            params={"email": email}
        )
        assert response2.status_code == 400
        assert "already signed up" in response2.json()["detail"].lower()

    def test_signup_nonexistent_activity(self):
        """Test signing up for non-existent activity returns error."""
        response = client.post(
            "/activities/Nonexistent Activity/signup",
            params={"email": "student@mergington.edu"}
        )
        
        assert response.status_code == 404
        assert "activity not found" in response.json()["detail"].lower()

    def test_signup_valid_email_format(self):
        """Test that signup works with valid email addresses."""
        response = client.post(
            "/activities/Art Club/signup",
            params={"email": "john.doe@mergington.edu"}
        )
        
        assert response.status_code == 200
        
        activities_response = client.get("/activities")
        activities = activities_response.json()
        assert "john.doe@mergington.edu" in activities["Art Club"]["participants"]


class TestRemoveEndpoint:
    """Test the POST /activities/{activity_name}/remove endpoint."""

    def test_remove_existing_participant(self):
        """Test removing a participant from an activity."""
        # First, add a participant
        client.post(
            "/activities/Drama Club/signup",
            params={"email": "remove_test@mergington.edu"}
        )
        
        # Then remove them
        response = client.post(
            "/activities/Drama Club/remove",
            params={"email": "remove_test@mergington.edu"}
        )
        
        assert response.status_code == 200
        assert "removed" in response.json()["message"].lower()
        
        # Verify participant was removed
        activities_response = client.get("/activities")
        activities = activities_response.json()
        assert "remove_test@mergington.edu" not in activities["Drama Club"]["participants"]

    def test_remove_nonexistent_participant(self):
        """Test removing a non-existent participant returns error."""
        response = client.post(
            "/activities/Math Club/remove",
            params={"email": "nonexistent@mergington.edu"}
        )
        
        assert response.status_code == 400
        assert "not signed up" in response.json()["detail"].lower()

    def test_remove_from_nonexistent_activity(self):
        """Test removing from non-existent activity returns error."""
        response = client.post(
            "/activities/Fake Activity/remove",
            params={"email": "student@mergington.edu"}
        )
        
        assert response.status_code == 404
        assert "activity not found" in response.json()["detail"].lower()

    def test_remove_original_participant(self):
        """Test removing an original participant from Chess Club."""
        response = client.post(
            "/activities/Chess Club/remove",
            params={"email": "michael@mergington.edu"}
        )
        
        assert response.status_code == 200
        
        # Verify participant was removed
        activities_response = client.get("/activities")
        activities = activities_response.json()
        assert "michael@mergington.edu" not in activities["Chess Club"]["participants"]
        assert "daniel@mergington.edu" in activities["Chess Club"]["participants"]


class TestActivityParticipantLimits:
    """Test that participant limits are respected."""

    def test_can_view_max_participants(self):
        """Test that max_participants is properly returned."""
        response = client.get("/activities")
        activities = response.json()
        
        assert activities["Chess Club"]["max_participants"] == 12
        assert activities["Basketball Team"]["max_participants"] == 15
        assert activities["Gym Class"]["max_participants"] == 30


class TestIntegrationScenario:
    """Test complete workflows with multiple operations."""

    def test_signup_and_remove_workflow(self):
        """Test a complete workflow of signing up and removing participants."""
        activity = "Debate Team"
        email = "workflow@mergington.edu"
        
        # Initially should be empty
        response = client.get("/activities")
        activities = response.json()
        initial_count = len(activities[activity]["participants"])
        
        # Sign up
        response = client.post(
            f"/activities/{activity}/signup",
            params={"email": email}
        )
        assert response.status_code == 200
        
        # Verify added
        response = client.get("/activities")
        activities = response.json()
        assert email in activities[activity]["participants"]
        assert len(activities[activity]["participants"]) == initial_count + 1
        
        # Remove
        response = client.post(
            f"/activities/{activity}/remove",
            params={"email": email}
        )
        assert response.status_code == 200
        
        # Verify removed
        response = client.get("/activities")
        activities = response.json()
        assert email not in activities[activity]["participants"]
        assert len(activities[activity]["participants"]) == initial_count
