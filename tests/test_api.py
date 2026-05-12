"""Tests for FastAPI backend."""

from __future__ import annotations

from fastapi.testclient import TestClient

from api.main import app
from api.auth import _WRIGHT_API_KEY

client = TestClient(app)
AUTH = {"X-Wright-API-Key": _WRIGHT_API_KEY}


def test_health_endpoint() -> None:
    """
    Tests the health check endpoint to verify it returns a 200 status code and valid response data.

    Validates that the /health endpoint responds with HTTP 200, returns a JSON object containing a 'status' field with value 'ok', and includes a 'version' field in the response.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_health_endpoint()
        ```
    """
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_health_requires_no_auth() -> None:
    """
    Tests that the /health endpoint returns a 200 status code without requiring authentication.

    This is a unit test function that verifies the health check endpoint is publicly accessible and responds successfully without any authentication headers or credentials.

    Returns:
        None: This test function does not return a value.

    Raises:
        AssertionError: When the /health endpoint does not return a 200 status code.

    Example:
        ```
        test_health_requires_no_auth()
        ```
    """
    resp = client.get("/health")
    assert resp.status_code == 200


def test_protected_endpoint_rejects_missing_key(tmp_path) -> None:
    """
    Tests that the protected coverage endpoint returns a 401 Unauthorized status when no authentication key is provided.

    This test function verifies the API security by attempting to access the /coverage endpoint without providing an authentication key, ensuring the endpoint properly rejects unauthorized requests.

    Args:
        tmp_path (pathlib.Path): A temporary directory path fixture provided by pytest, used as the repo_root parameter in the API request.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_protected_endpoint_rejects_missing_key(tmp_path)
        ```
    """
    resp = client.get(f"/coverage?repo_root={tmp_path}")
    assert resp.status_code == 401


def test_coverage_endpoint_returns_valid_structure(tmp_path) -> None:
    """
    Tests that the coverage endpoint returns a valid JSON response structure with required fields.

    This test function verifies that the /coverage API endpoint returns a 200 status code and a JSON response containing the required keys: overall_pct, total, documented, and undocumented. It uses a temporary directory path as the repo_root parameter.

    Args:
        tmp_path (Path): A pytest fixture providing a temporary directory path used as the repository root for the coverage endpoint test.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_coverage_endpoint_returns_valid_structure(tmp_path)
        ```
    """
    resp = client.get(f"/coverage?repo_root={tmp_path}", headers=AUTH)
    assert resp.status_code == 200
    data = resp.json()
    assert "overall_pct" in data
    assert "total" in data
    assert "documented" in data
    assert "undocumented" in data


def test_drift_check_endpoint(tmp_path) -> None:
    """
    Tests the /drift-check API endpoint to verify it correctly processes drift check requests and returns expected response structure.

    Sends a POST request to the /drift-check endpoint with a repository root path, Git revision reference, and auto-fix flag. Validates that the response has a 200 status code and contains the required 'total_checked' and 'results' fields in the JSON response.

    Args:
        tmp_path (pathlib.Path): Pytest fixture providing a temporary directory path used as the repository root for testing.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_drift_check_endpoint(tmp_path)
        ```
    """
    payload = {"repo_root": str(tmp_path), "since": "HEAD~1", "auto_fix": False}
    resp = client.post("/drift-check", json=payload, headers=AUTH)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_checked" in data
    assert "results" in data
