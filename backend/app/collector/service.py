"""Orchestration des imports de tirages.

Pipeline (identique pour toutes les sources) :
  téléchargement → parsing → validation → dédoublonnage → insertion
  → quarantaine des lignes invalides → journalisation complète.

Règles :
  * uniquement des sources publiques légalement accessibles, déclarées en
    variables d'environnement — jamais de contournement d'authentification,
    de captcha ou de limitation technique ;
  * en cas d'échec, le job est marqué `failed` et le planificateur retente
    avec backoff jusqu'à `COLLECTOR_MAX_RETRIES`, puis alerte l'administrateur ;
  * un changement de format source déclenche une erreur explicite (pas
    d'insertion hasardeuse).
"""

import logging

import httpx

from ..core.config import Settings
from ..db.repository import Repository
from ..schemas.draws import DrawCreate
from .parser import FormatChangeError, ParserError, parse_results_file

logger = logging.getLogger(__name__)

ALLOWED_UPLOAD_EXTENSIONS = {".csv", ".zip"}


class CollectorService:
    def __init__(self, repository: Repository, settings: Settings) -> None:
        self._repo = repository
        self._settings = settings

    async def _download(self, url: str) -> bytes:
        async with httpx.AsyncClient(
            timeout=self._settings.collector_timeout_seconds,
            headers={"User-Agent": self._settings.collector_user_agent},
            follow_redirects=True,
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.content

    async def run_scheduled_sync(self, triggered_by: str = "scheduler", attempt: int = 1) -> dict:
        """Synchronisation automatique depuis les sources configurées."""
        urls = self._settings.collector_history_url_list
        if not urls:
            job_id = await self._repo.create_import_job(
                source="scheduler", status="failed", triggered_by=triggered_by, attempt=attempt
            )
            await self._repo.add_sync_log(
                job_id,
                "error",
                "Aucune source configurée (COLLECTOR_HISTORY_URLS vide). "
                "Renseignez les URLs des fichiers officiels ou utilisez l'import manuel.",
            )
            await self._repo.update_import_job(
                job_id, finished_at=_now(), error="Aucune source configurée."
            )
            return {"job_id": job_id, "status": "failed", "imported": 0}

        summary = {"job_id": None, "status": "success", "imported": 0, "skipped": 0, "quarantined": 0}
        for url in urls:
            result = await self.import_from_url(url, triggered_by=triggered_by, attempt=attempt)
            summary["job_id"] = result["job_id"]
            summary["imported"] += result["imported"]
            summary["skipped"] += result["skipped"]
            summary["quarantined"] += result["quarantined"]
            if result["status"] == "failed":
                summary["status"] = "failed"
                break
        return summary

    async def import_from_url(
        self, url: str, triggered_by: str = "manual", attempt: int = 1
    ) -> dict:
        job_id = await self._repo.create_import_job(
            source="remote",
            source_url=url,
            status="running",
            triggered_by=triggered_by,
            attempt=attempt,
            started_at=_now(),
        )
        await self._repo.add_sync_log(job_id, "info", "Téléchargement de la source.", {"url": url})
        try:
            content = await self._download(url)
        except httpx.HTTPError as exc:
            message = f"Source injoignable : {type(exc).__name__}"
            logger.warning("Import %s échoué : %s", job_id, message)
            await self._repo.add_sync_log(job_id, "error", message, {"url": url})
            await self._repo.update_import_job(
                job_id, status="failed", finished_at=_now(), error=message
            )
            return {"job_id": job_id, "status": "failed", "imported": 0, "skipped": 0, "quarantined": 0}

        return await self._ingest(job_id, content, source="remote", source_url=url)

    async def import_manual_file(
        self, content: bytes, filename: str, user_id: str | None = None
    ) -> dict:
        """Import manuel de secours depuis le back-office."""
        job_id = await self._repo.create_import_job(
            source="manual",
            source_url=filename,
            status="running",
            triggered_by="admin",
            triggered_by_user=user_id,
            started_at=_now(),
        )
        return await self._ingest(job_id, content, source="manual", source_url=filename)

    async def _ingest(
        self, job_id: int, content: bytes, source: str, source_url: str | None
    ) -> dict:
        try:
            parsed = parse_results_file(content)
        except FormatChangeError as exc:
            await self._repo.add_sync_log(
                job_id,
                "error",
                "CHANGEMENT DE FORMAT DÉTECTÉ — intervention administrateur requise.",
                {"detail": str(exc)},
            )
            await self._repo.update_import_job(
                job_id, status="failed", finished_at=_now(), error=str(exc)
            )
            return {"job_id": job_id, "status": "failed", "imported": 0, "skipped": 0, "quarantined": 0}
        except ParserError as exc:
            await self._repo.add_sync_log(job_id, "error", f"Fichier illisible : {exc}")
            await self._repo.update_import_job(
                job_id, status="failed", finished_at=_now(), error=str(exc)
            )
            return {"job_id": job_id, "status": "failed", "imported": 0, "skipped": 0, "quarantined": 0}

        quarantined = 0
        for rejected in parsed.rejected:
            await self._repo.add_quarantine(job_id, rejected.raw, rejected.reason)
            quarantined += 1

        draws = [
            DrawCreate(
                draw_date=row.draw_date,
                numbers=row.numbers,
                chance=row.chance,
                source=source,
                source_url=source_url,
            )
            for row in parsed.rows
        ]
        inserted, skipped = await self._repo.insert_draws(draws)

        status = "success" if quarantined == 0 else "partial"
        await self._repo.update_import_job(
            job_id,
            status=status,
            finished_at=_now(),
            draws_found=len(parsed.rows) + quarantined,
            draws_imported=inserted,
            draws_skipped=skipped,
            draws_quarantined=quarantined,
        )
        await self._repo.add_sync_log(
            job_id,
            "info",
            "Import terminé.",
            {
                "imported": inserted,
                "skipped_duplicates": skipped,
                "quarantined": quarantined,
                "mapping": parsed.mapping_used,
            },
        )
        logger.info(
            "Import %s : %d insérés, %d doublons ignorés, %d en quarantaine",
            job_id,
            inserted,
            skipped,
            quarantined,
        )
        return {
            "job_id": job_id,
            "status": status,
            "imported": inserted,
            "skipped": skipped,
            "quarantined": quarantined,
        }

    async def approve_quarantined(self, item_id: int, reviewer_id: str) -> dict:
        """Valide manuellement une ligne en quarantaine après correction visuelle."""
        item = await self._repo.get_quarantine(item_id)
        if item is None:
            from ..core.errors import NotFoundError

            raise NotFoundError("Élément de quarantaine introuvable.")
        raw = item["raw_data"]
        parsed = parse_results_file(_raw_to_csv(raw).encode("utf-8"))
        if not parsed.rows:
            from ..core.errors import AppError

            reason = parsed.rejected[0].reason if parsed.rejected else "Ligne toujours invalide."
            raise AppError("still_invalid", f"Validation impossible : {reason}")
        row = parsed.rows[0]
        inserted, skipped = await self._repo.insert_draws(
            [
                DrawCreate(
                    draw_date=row.draw_date,
                    numbers=row.numbers,
                    chance=row.chance,
                    source="quarantine_approved",
                )
            ]
        )
        await self._repo.review_quarantine(item_id, "approved", reviewer_id)
        return {"inserted": inserted, "skipped": skipped}


def _raw_to_csv(raw: dict) -> str:
    headers = list(raw.keys())
    values = [str(raw[h]) if raw[h] is not None else "" for h in headers]
    return ";".join(headers) + "\n" + ";".join(values)


def _now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()
