"""Tests de l'endpoint de synchronisation déclenché par un cron externe."""

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


def test_cron_sync_disabled_without_secret(client):
    # COLLECTOR_CRON_SECRET vide par défaut dans l'environnement de test.
    response = client.post("/api/v1/cron/sync", headers={"X-Cron-Secret": "peu importe"})
    assert response.status_code == 404


def test_cron_sync_rejects_wrong_secret(monkeypatch):
    monkeypatch.setenv("COLLECTOR_CRON_SECRET", "le-bon-secret")
    get_settings.cache_clear()
    app = create_app()
    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/v1/cron/sync", headers={"X-Cron-Secret": "un-mauvais-secret"}
        )
        assert response.status_code == 401

        no_header = test_client.post("/api/v1/cron/sync")
        assert no_header.status_code == 401
    get_settings.cache_clear()


def test_cron_sync_accepts_correct_secret(monkeypatch):
    monkeypatch.setenv("COLLECTOR_CRON_SECRET", "le-bon-secret")
    get_settings.cache_clear()
    app = create_app()
    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/v1/cron/sync", headers={"X-Cron-Secret": "le-bon-secret"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "failed"  # aucune source configurée en test
    get_settings.cache_clear()
