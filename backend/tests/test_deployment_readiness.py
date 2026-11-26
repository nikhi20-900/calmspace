"""
Issue #15 Deployment Readiness, Secret Hygiene, CORS, Health & Failure-Mode Tests.
"""

import re
import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app, resolve_cors_settings
from app.services.storage import storage

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_health_and_readiness_do_not_expose_secrets(monkeypatch):
    """Health and readiness endpoints must report service state without leaking keys, paths, or records."""
    fake_secret = "AIzaSySyntheticSecretValueDoNotLeak12345"
    monkeypatch.setenv("CALMSPACE_AI_API_KEY", fake_secret)
    monkeypatch.setenv("CALMSPACE_AI_PROVIDER", "gemini")

    client = TestClient(app)

    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "healthy"
    assert fake_secret not in health_res.text

    ready_res = client.get("/api/ready")
    assert ready_res.status_code == 200
    body = ready_res.json()
    assert body["status"] == "ready"
    assert body["database"] == "connected"
    assert fake_secret not in ready_res.text
    assert "sqlite" not in ready_res.text.lower()
    assert "calmspace.db" not in ready_res.text.lower()


def test_readiness_returns_503_safely_when_database_unavailable(monkeypatch):
    """Database failure on /api/ready must return 503 without exposing internal paths or SQL."""

    def broken_health():
        raise sqlite3.OperationalError(
            "unable to open database file /secret/internal/calmspace.db"
        )

    monkeypatch.setattr(storage, "check_health", broken_health)
    client = TestClient(app)

    res = client.get("/api/ready")
    assert res.status_code == 503
    assert res.json() == {"status": "unavailable", "database": "error"}
    assert "/secret/internal" not in res.text
    assert "unable to open" not in res.text


def test_database_error_handler_sanitizes_internal_details(monkeypatch):
    """Unhandled sqlite3.Error during endpoint execution must not leak SQL statements or paths."""

    def broken_get_checkins(session_id: str):
        raise sqlite3.OperationalError(
            "no such table: secret_internal_table at /var/data/calmspace.db"
        )

    monkeypatch.setattr(storage, "get_checkins", broken_get_checkins)
    client = TestClient(app, raise_server_exceptions=False)

    res = client.get(
        "/api/checkin/history", headers={"X-Session-ID": "deploy-err-test"}
    )
    assert res.status_code == 503
    assert (
        res.json()["detail"]
        == "Database service temporarily unavailable. Please try again."
    )
    assert "secret_internal_table" not in res.text
    assert "/var/data" not in res.text


def test_production_cors_disallows_wildcard_origins():
    """Production CORS must reject wildcard '*' and allow only explicit origins."""
    origins, creds = resolve_cors_settings(cors_env="*", env_mode="production")
    assert origins == []
    assert creds is False

    explicit_origins, explicit_creds = resolve_cors_settings(
        cors_env="https://calmspace.example.com/, https://preview.calmspace.example.com",
        env_mode="production",
    )
    assert explicit_origins == [
        "https://calmspace.example.com",
        "https://preview.calmspace.example.com",
    ]
    assert explicit_creds is True


def test_env_examples_contain_placeholders_and_no_real_secrets():
    """Verify .env.example files contain valid variable names and zero embedded secrets."""
    backend_env = (REPO_ROOT / "backend" / ".env.example").read_text(encoding="utf-8")
    frontend_env = (REPO_ROOT / "frontend" / ".env.example").read_text(encoding="utf-8")

    # Ensure actual config variables from app/core/config.py are documented
    for required_var in [
        "CALMSPACE_ENV=",
        "CORS_ORIGINS=",
        "DATABASE_URL=",
        "CALMSPACE_AI_PROVIDER=",
        "CALMSPACE_AI_API_KEY=",
        "CALMSPACE_AI_ALLOW_LOCAL_RATE_LIMITER=",
    ]:
        assert required_var in backend_env

    assert "VITE_API_BASE_URL=" in frontend_env

    # Never embed Google API keys or real credentials in example files
    assert not re.search(r"AIza[0-9A-Za-z_-]{20,}", backend_env + frontend_env)
    assert "CALMSPACE_AI_API_KEY=\n" in backend_env


def test_deployment_configs_exist_without_streamlit():
    """Deployment artifacts must exist cleanly with zero Streamlit configuration."""
    config_files = [
        REPO_ROOT / "backend" / "Dockerfile",
        REPO_ROOT / "backend" / ".dockerignore",
        REPO_ROOT / "frontend" / "Dockerfile",
        REPO_ROOT / "frontend" / ".dockerignore",
        REPO_ROOT / "frontend" / "nginx.conf",
        REPO_ROOT / "docker-compose.yml",
        REPO_ROOT / "render.yaml",
    ]
    for path in config_files:
        assert path.is_file(), f"Missing deployment artifact: {path}"
        content = path.read_text(encoding="utf-8").lower()
        assert "streamlit" not in content, f"Unexpected Streamlit ref in {path}"

    assert (REPO_ROOT / "docs" / "deployment.md").is_file()
