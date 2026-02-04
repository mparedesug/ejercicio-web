"""Pytest configuration and fixtures for testing the FastAPI application."""

import sys
from pathlib import Path

# Add src directory to path to allow imports from src
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import pytest
from fastapi.testclient import TestClient
from app import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI application."""
    return TestClient(app)
