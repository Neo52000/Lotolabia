"""Tests du script de synchronisation exécuté par le cron GitHub Actions."""

import asyncio
import importlib.util
from pathlib import Path

from app.core.config import get_settings
from app.db.repository import MemoryRepository

SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "run_scheduled_sync.py"


def _load_script():
    spec = importlib.util.spec_from_file_location("run_scheduled_sync", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_script_refuses_to_run_without_supabase(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "")
    get_settings.cache_clear()
    try:
        assert asyncio.run(_load_script().main()) == 1
    finally:
        get_settings.cache_clear()


def test_script_records_job_accepted_by_database_constraint(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://exemple.invalid")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "cle-de-test")
    monkeypatch.setenv("COLLECTOR_HISTORY_URLS", "")
    get_settings.cache_clear()

    repository = MemoryRepository()

    async def aclose() -> None:
        return None

    repository.aclose = aclose
    module = _load_script()
    monkeypatch.setattr(module, "SupabaseRepository", lambda url, key: repository)
    try:
        exit_code = asyncio.run(module.main())
    finally:
        get_settings.cache_clear()

    # Aucune source configurée : échec attendu, mais le job doit être journalisé
    # avec une valeur triggered_by acceptée par la contrainte SQL.
    assert exit_code == 1
    jobs = asyncio.run(repository.list_import_jobs())
    assert len(jobs) == 1
    assert jobs[0]["triggered_by"] == "scheduler"
    assert jobs[0]["status"] == "failed"
