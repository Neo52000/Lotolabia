"""Tests du pipeline d'import (service collecteur) sur dépôt mémoire."""

import anyio
import httpx
import pytest

from app.collector.service import CollectorService
from app.core.config import Settings
from app.db.repository import MemoryRepository

CSV = (
    "date,n1,n2,n3,n4,n5,chance\n"
    "2020-01-04,3,12,24,37,48,6\n"
    "2020-01-06,1,9,24,31,43,10\n"
    "2020-01-08,5,5,24,31,43,10\n"  # invalide : doublon → quarantaine
)


def run(coro):
    return anyio.run(lambda: coro)


@pytest.fixture()
def service():
    repo = MemoryRepository()
    settings = Settings(supabase_url="", supabase_service_role_key="")
    return CollectorService(repo, settings), repo


def test_manual_import_pipeline(service):
    collector, repo = service

    async def scenario():
        result = await collector.import_manual_file(CSV.encode(), "test.csv", "admin-id")
        assert result["status"] == "partial"
        assert result["imported"] == 2
        assert result["quarantined"] == 1

        draws = await repo.all_draws()
        assert len(draws) == 2

        jobs = await repo.list_import_jobs()
        assert jobs[0]["status"] == "partial"
        assert jobs[0]["draws_imported"] == 2

        quarantine = await repo.list_quarantine("pending")
        assert len(quarantine) == 1
        assert "double" in quarantine[0]["reason"].lower()

        logs = await repo.list_sync_logs()
        assert any("Import terminé" in log["message"] for log in logs)

    run(scenario())


def test_reimport_skips_duplicates(service):
    collector, repo = service

    async def scenario():
        await collector.import_manual_file(CSV.encode(), "a.csv")
        result = await collector.import_manual_file(CSV.encode(), "b.csv")
        assert result["imported"] == 0
        assert result["skipped"] == 2
        assert len(await repo.all_draws()) == 2

    run(scenario())


def test_scheduled_sync_without_sources_fails_with_alert(service):
    collector, repo = service

    async def scenario():
        result = await collector.run_scheduled_sync()
        assert result["status"] == "failed"
        logs = await repo.list_sync_logs()
        assert any(log["level"] == "error" for log in logs)

    run(scenario())


def test_network_failure_marks_job_failed(service, monkeypatch):
    collector, repo = service

    async def failing_download(url):
        raise httpx.ConnectError("réseau indisponible")

    monkeypatch.setattr(collector, "_download", failing_download)

    async def scenario():
        result = await collector.import_from_url("https://exemple.invalid/loto.csv")
        assert result["status"] == "failed"
        jobs = await repo.list_import_jobs()
        assert jobs[0]["status"] == "failed"
        assert "injoignable" in (jobs[0].get("error") or "")

    run(scenario())


def test_format_change_alerts_admin(service):
    collector, repo = service

    async def scenario():
        bad = "colonnes;inconnues\n1;2\n"
        result = await collector.import_manual_file(bad.encode(), "mauvais.csv")
        assert result["status"] == "failed"
        logs = await repo.list_sync_logs()
        assert any("CHANGEMENT DE FORMAT" in log["message"] for log in logs)

    run(scenario())


def test_quarantine_approval_flow(service):
    collector, repo = service

    async def scenario():
        await collector.import_manual_file(CSV.encode(), "test.csv")
        item = (await repo.list_quarantine("pending"))[0]
        # correction de la donnée brute puis validation
        item["raw_data"]["n2"] = "7"
        result = await collector.approve_quarantined(item["id"], "admin-id")
        assert result["inserted"] == 1
        assert (await repo.get_quarantine(item["id"]))["status"] == "approved"

    run(scenario())
