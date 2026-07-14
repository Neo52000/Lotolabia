"""Planification des synchronisations automatiques.

Calendrier (heure de Paris, configurable via SCHEDULER_TIMEZONE) :
  * lundi, mercredi, samedi à 22 h 30 — soirées de tirage du Loto ;
  * mardi, jeudi, dimanche à 12 h 00 — contrôle du lendemain (rattrapage si
    la publication était en retard la veille).

En cas d'échec, de nouvelles tentatives sont programmées avec backoff
exponentiel (COLLECTOR_RETRY_BACKOFF_SECONDS × 2^n) jusqu'à
COLLECTOR_MAX_RETRIES, puis une alerte administrateur est journalisée
(sync_logs niveau error + job failed visible dans le back-office).

Le planificateur n'est actif que si SCHEDULER_ENABLED=true (une seule
instance de l'API doit le porter).
"""

import logging
from datetime import UTC, datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger

from ..core.config import Settings
from .service import CollectorService

logger = logging.getLogger(__name__)


class SyncScheduler:
    def __init__(self, collector: CollectorService, settings: Settings) -> None:
        self._collector = collector
        self._settings = settings
        self._scheduler = AsyncIOScheduler(timezone=settings.scheduler_timezone)

    def start(self) -> None:
        tz = self._settings.scheduler_timezone
        # Soirées de tirage
        self._scheduler.add_job(
            self._run,
            CronTrigger(day_of_week="mon,wed,sat", hour=22, minute=30, timezone=tz),
            id="post_draw_sync",
            kwargs={"attempt": 1},
            replace_existing=True,
        )
        # Contrôles du lendemain
        self._scheduler.add_job(
            self._run,
            CronTrigger(day_of_week="tue,thu,sun", hour=12, minute=0, timezone=tz),
            id="next_day_check",
            kwargs={"attempt": 1},
            replace_existing=True,
        )
        self._scheduler.start()
        logger.info("Planificateur démarré (%s).", tz)

    def shutdown(self) -> None:
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)

    def next_runs(self) -> list[dict]:
        return [
            {
                "job_id": job.id,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            }
            for job in self._scheduler.get_jobs()
        ]

    async def _run(self, attempt: int = 1) -> None:
        result = await self._collector.run_scheduled_sync(
            triggered_by="scheduler" if attempt == 1 else "retry", attempt=attempt
        )
        if result["status"] != "failed":
            return
        if attempt >= self._settings.collector_max_retries:
            logger.error(
                "Synchronisation en échec après %d tentatives — alerte administrateur.", attempt
            )
            return
        delay = self._settings.collector_retry_backoff_seconds * (2 ** (attempt - 1))
        run_at = datetime.now(UTC) + timedelta(seconds=delay)
        self._scheduler.add_job(
            self._run,
            DateTrigger(run_date=run_at),
            id=f"retry_sync_{attempt + 1}",
            kwargs={"attempt": attempt + 1},
            replace_existing=True,
        )
        logger.warning(
            "Synchronisation échouée (tentative %d) — nouvelle tentative dans %d s.",
            attempt,
            delay,
        )
