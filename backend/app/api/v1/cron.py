"""Déclenchement de la synchronisation par un planificateur externe.

Distinct de `/admin/sync` (qui exige un JWT admin) : ce routeur est prévu
pour un appel automatisé (ex. cron GitHub Actions) quand l'API tourne en
scale-to-zero et ne peut donc pas porter le planificateur interne
(`SyncScheduler`). Authentification par secret partagé, jamais par JWT.
"""

import hmac
import logging

from fastapi import APIRouter, Depends, Header, Request

from ...collector.service import CollectorService
from ...core.config import Settings, get_settings
from ...core.errors import NotFoundError, UnauthorizedError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cron", tags=["Cron"])


def get_collector(request: Request) -> CollectorService:
    return request.app.state.collector


@router.post("/sync")
async def cron_sync(
    request: Request,
    x_cron_secret: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    if not settings.collector_cron_secret:
        # Endpoint non activé : on répond 404 plutôt que 401 pour ne pas
        # même révéler son existence tant qu'il n'est pas configuré.
        raise NotFoundError("Ressource introuvable.")
    if not x_cron_secret or not hmac.compare_digest(x_cron_secret, settings.collector_cron_secret):
        raise UnauthorizedError("Secret cron invalide.")

    collector = get_collector(request)
    result = await collector.run_scheduled_sync(triggered_by="github_actions_cron")
    logger.info("Synchronisation déclenchée par cron externe : %s", result.get("status"))
    return result
