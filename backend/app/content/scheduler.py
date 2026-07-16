"""Planification de la production éditoriale automatique.

Calendrier par défaut : chaque lundi à 06 h 00 (heure de Paris, configurable
via SCHEDULER_TIMEZONE), le service produit jusqu'à `CONTENT_BATCH_SIZE`
nouveaux articles et rafraîchit le contenu vivant (palmarès glissant).

Actif uniquement si CONTENT_SCHEDULER_ENABLED=true (une seule instance de
l'API doit le porter, comme pour le planificateur de collecte).
"""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from ..core.config import Settings
from .service import ContentGenerationService

logger = logging.getLogger(__name__)


class ContentScheduler:
    def __init__(self, service: ContentGenerationService, settings: Settings) -> None:
        self._service = service
        self._settings = settings
        self._scheduler = AsyncIOScheduler(timezone=settings.scheduler_timezone)

    def start(self) -> None:
        self._scheduler.add_job(
            self._run,
            CronTrigger(
                day_of_week=self._settings.content_schedule_day_of_week,
                hour=self._settings.content_schedule_hour,
                minute=self._settings.content_schedule_minute,
                timezone=self._settings.scheduler_timezone,
            ),
            id="content_generation",
            replace_existing=True,
        )
        self._scheduler.start()
        logger.info("Planificateur de contenu démarré (%s).", self._settings.scheduler_timezone)

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

    async def _run(self) -> None:
        try:
            published = await self._service.run_batch(
                max_new=self._settings.content_batch_size, actor_email="scheduler"
            )
            logger.info("Production éditoriale planifiée : %s", published)
        except Exception:  # noqa: BLE001 — ne doit jamais faire tomber le planificateur
            logger.exception("Échec de la production éditoriale planifiée.")
