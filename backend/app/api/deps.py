"""Dépendances FastAPI partagées."""

from fastapi import Depends, Request

from ..core.cache import TTLCache
from ..core.config import Settings, get_settings
from ..db.repository import Repository
from ..schemas.draws import Draw
from ..services.premium import PremiumPolicy


def get_repository(request: Request) -> Repository:
    return request.app.state.repository


def get_cache(request: Request) -> TTLCache:
    return request.app.state.cache


def get_policy(settings: Settings = Depends(get_settings)) -> PremiumPolicy:
    return PremiumPolicy(settings)


async def get_all_draws_cached(
    request: Request,
    repository: Repository = Depends(get_repository),
) -> list[Draw]:
    """Historique complet trié par date croissante, mis en cache."""
    cache: TTLCache = request.app.state.cache
    cached = cache.get("all_draws")
    if cached is not None:
        return cached
    draws = await repository.all_draws()
    cache.set("all_draws", draws)
    return draws
