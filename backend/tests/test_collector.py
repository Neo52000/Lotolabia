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


def _full_csv() -> str:
    from tests.test_parser import FDJ_FULL_HEADER, FDJ_FULL_ROW

    return FDJ_FULL_HEADER + FDJ_FULL_ROW


def test_import_stores_prizes_and_second_draw(service):
    collector, repo = service

    async def scenario():
        result = await collector.import_manual_file(_full_csv().encode(), "full.csv")
        assert result["imported"] == 1 and result["details_backfilled"] == 0
        draw = (await repo.all_draws())[0]
        assert draw.jackpot_euros == 15_000_000
        assert draw.prizes["3"].winners == 72
        assert draw.second_draw.numbers == [18, 30, 34, 35, 44]
        assert draw.second_draw.prizes["4"].amount == 3.0

    run(scenario())


def test_reimport_backfills_missing_prizes_without_overwriting(service):
    collector, repo = service

    async def scenario():
        # 1) tirage importé « à l'ancienne » (sans gains)
        await collector.import_manual_file(
            b"date,n1,n2,n3,n4,n5,chance\n2026-11-11,5,14,17,29,4,8\n", "old.csv"
        )
        assert (await repo.all_draws())[0].prizes is None
        # 2) ré-import du fichier complet : doublon ignoré mais gains complétés
        result = await collector.import_manual_file(_full_csv().encode(), "full.csv")
        assert result["imported"] == 0 and result["skipped"] == 1
        assert result["details_backfilled"] == 1
        draw = (await repo.all_draws())[0]
        assert draw.prizes["1"].amount == 15_000_000.0
        # 3) un nouveau ré-import ne réécrit rien
        again = await collector.import_manual_file(_full_csv().encode(), "full.csv")
        assert again["details_backfilled"] == 0

    run(scenario())


def test_supabase_backfill_only_patches_rows_without_prizes():
    from datetime import date

    from app.db.supabase_repo import SupabaseRepository
    from app.schemas.draws import DrawCreate

    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if request.method == "GET":  # une seule date sans gains en base
            return httpx.Response(200, json=[{"draw_date": "2026-11-11"}])
        return httpx.Response(200, json=[{"id": 1}])

    repo = SupabaseRepository("https://x.supabase.co", "key")
    repo._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    prizes = {"1": {"winners": 0, "amount": 15_000_000.0}}
    items = [
        DrawCreate(
            draw_date=date(2026, 11, 11), numbers=[4, 5, 14, 17, 29], chance=8,
            jackpot_euros=15_000_000, prizes=prizes,
        ),
        DrawCreate(  # déjà complet en base : ne doit produire aucun PATCH
            draw_date=date(2026, 11, 9), numbers=[4, 5, 14, 37, 41], chance=8, prizes=prizes
        ),
    ]
    updated = run(repo.backfill_draw_details(items))
    assert updated == 1
    patches = [c for c in calls if c.method == "PATCH"]
    assert len(patches) == 1
    assert patches[0].url.params["draw_date"] == "eq.2026-11-11"
    assert patches[0].url.params["prizes"] == "is.null"  # garde-fou anti-écrasement


def test_postgrest_error_reason_is_logged_but_not_exposed(caplog):
    from datetime import date

    from app.core.errors import UpstreamError
    from app.db.supabase_repo import SupabaseRepository
    from app.schemas.draws import DrawCreate

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            400,
            json={
                "code": "PGRST204",
                "message": "Could not find the 'prizes' column of 'draws' in the schema cache",
                "details": "Failing row contains (2026-11-11, {4,5,14,17,29}, 8)",
            },
        )

    repo = SupabaseRepository("https://x.supabase.co", "secret-key")
    repo._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    draw = DrawCreate(draw_date=date(2026, 11, 11), numbers=[4, 5, 14, 17, 29], chance=8)

    with caplog.at_level("WARNING", logger="app.db.supabase_repo"):
        with pytest.raises(UpstreamError) as excinfo:
            run(repo.insert_draws([draw]))

    assert str(excinfo.value) == "Erreur base de données (HTTP 400)."  # message client inchangé
    logged = caplog.text
    assert "PGRST204" in logged and "'prizes' column" in logged and "HTTP 400" in logged
    assert "Failing row" not in logged  # `details` jamais journalisé
    assert "secret-key" not in logged


# --- Repli quand la migration 0006 n'est pas appliquée -----------------------


def _fallback_repo(handler):
    from app.db.supabase_repo import SupabaseRepository

    repo = SupabaseRepository("https://x.supabase.co", "k")
    repo._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return repo


def _detailed_draw(day: int):
    from datetime import date

    from app.schemas.draws import DrawCreate

    return DrawCreate(
        draw_date=date(2026, 11, day),
        numbers=[4, 5, 14, 17, 29],
        chance=8,
        jackpot_euros=15_000_000,
        prizes={"1": {"winners": 0, "amount": 15_000_000.0}},
        second_draw={"numbers": [18, 30, 34, 35, 44], "promotion": None, "prizes": {}},
    )


def test_insert_falls_back_without_prize_columns_and_warns(caplog):
    import json

    bodies: list[list[dict]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        rows = json.loads(request.content)
        bodies.append(rows)
        if "prizes" in rows[0]:  # base sans migration 0006
            return httpx.Response(
                400,
                json={
                    "code": "PGRST204",
                    "message": "Could not find the 'prizes' column of 'draws' in the schema cache",
                },
            )
        return httpx.Response(201, json=[{"id": i} for i, _ in enumerate(rows, 1)])

    repo = _fallback_repo(handler)
    with caplog.at_level("WARNING", logger="app.db.supabase_repo"):
        inserted, skipped = run(repo.insert_draws([_detailed_draw(9), _detailed_draw(11)]))

    assert (inserted, skipped) == (2, 0)
    assert len(bodies) == 2  # un essai refusé, puis le réessai sans les colonnes de gains
    retry = bodies[1][0]
    assert "prizes" not in retry and "second_draw" not in retry
    assert retry["jackpot_euros"] == 15_000_000  # colonne ancienne : toujours envoyée
    assert retry["numbers"] == [4, 5, 14, 17, 29] and retry["chance"] == 8
    assert repo.details_supported is False
    assert "migration 0006 non appliquée" in caplog.text


def test_after_fallback_next_insert_skips_the_failing_attempt():
    import json

    calls: list[bool] = []

    def handler(request: httpx.Request) -> httpx.Response:
        rows = json.loads(request.content)
        calls.append("prizes" in rows[0])
        if "prizes" in rows[0]:
            return httpx.Response(
                400,
                json={"code": "PGRST204", "message": "Could not find the 'prizes' column"},
            )
        return httpx.Response(201, json=[{"id": 1}])

    repo = _fallback_repo(handler)
    run(repo.insert_draws([_detailed_draw(9)]))
    run(repo.insert_draws([_detailed_draw(11)]))
    assert calls == [True, False, False]  # 2e insertion : directement sans les colonnes


def test_backfill_is_skipped_when_columns_are_missing():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"  # jamais de PATCH
        return httpx.Response(
            400, json={"code": "42703", "message": "column draws.prizes does not exist"}
        )

    repo = _fallback_repo(handler)
    assert run(repo.backfill_draw_details([_detailed_draw(9)])) == 0
    assert repo.details_supported is False


def test_unrelated_missing_column_is_not_swallowed():
    from app.core.errors import UpstreamError

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            400, json={"code": "PGRST204", "message": "Could not find the 'chance' column"}
        )

    repo = _fallback_repo(handler)
    with pytest.raises(UpstreamError):
        run(repo.insert_draws([_detailed_draw(9)]))
    assert repo.details_supported is True


def test_service_logs_warning_when_details_unsupported(service):
    collector, repo = service
    repo.details_supported = False  # simule le dépôt Supabase en mode repli

    async def scenario():
        await collector.import_manual_file(_full_csv().encode(), "full.csv")
        logs = await repo.list_sync_logs()
        assert any(
            entry["level"] == "warning" and "migration 0006" in entry["message"] for entry in logs
        )

    run(scenario())
