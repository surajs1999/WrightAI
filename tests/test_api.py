"""Tests for FastAPI backend."""

from __future__ import annotations

from fastapi.testclient import TestClient

from api.main import app
from api.auth import _WRIGHT_API_KEY

client = TestClient(app)
AUTH = {"X-Wright-API-Key": _WRIGHT_API_KEY}


def test_health_endpoint() -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_health_requires_no_auth() -> None:
    resp = client.get("/health")
    assert resp.status_code == 200


def test_protected_endpoint_rejects_missing_key(tmp_path) -> None:
    resp = client.get(f"/coverage?repo_root={tmp_path}")
    assert resp.status_code == 401


def test_coverage_endpoint_returns_valid_structure(tmp_path) -> None:
    resp = client.get(f"/coverage?repo_root={tmp_path}", headers=AUTH)
    assert resp.status_code == 200
    data = resp.json()
    assert "overall_pct" in data
    assert "total" in data
    assert "documented" in data
    assert "undocumented" in data


def test_drift_check_endpoint(tmp_path) -> None:
    payload = {"repo_root": str(tmp_path), "since": "HEAD~1", "auto_fix": False}
    resp = client.post("/drift-check", json=payload, headers=AUTH)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_checked" in data
    assert "results" in data
