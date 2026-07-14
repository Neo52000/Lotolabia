"""Endpoints publics : tirages et exports."""

from datetime import date

from fastapi import APIRouter, Depends, Query, Response

from ...core.errors import NotFoundError
from ...core.security import AuthUser, get_optional_user, require_user
from ...db.repository import Repository
from ...schemas.draws import Draw, DrawPage
from ...services.exports import draws_to_csv
from ...services.premium import PremiumPolicy
from ..deps import get_all_draws_cached, get_policy, get_repository

router = APIRouter(prefix="/draws", tags=["Tirages"])


@router.get("", response_model=DrawPage)
async def list_draws(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    year: int | None = Query(None, ge=1976, le=2100),
    month: int | None = Query(None, ge=1, le=12),
    repository: Repository = Depends(get_repository),
    user: AuthUser | None = Depends(get_optional_user),
    policy: PremiumPolicy = Depends(get_policy),
) -> DrawPage:
    items, total = await repository.list_draws(page, page_size, year=year, month=month)
    limit = policy.history_limit(user)
    truncated = False
    if limit is not None and total > limit:
        # l'offre gratuite est limitée aux `limit` tirages les plus récents
        already_served = (page - 1) * page_size
        remaining = max(0, limit - already_served)
        if len(items) > remaining:
            items = items[:remaining]
            truncated = True
        total = limit
    return DrawPage(items=items, total=total, page=page, page_size=page_size, truncated=truncated)


@router.get("/latest", response_model=Draw)
async def latest_draw(repository: Repository = Depends(get_repository)) -> Draw:
    draw = await repository.latest_draw()
    if draw is None:
        raise NotFoundError("Aucun tirage disponible pour le moment.")
    return draw


@router.get("/export.csv")
async def export_csv(
    user: AuthUser = Depends(require_user),
    policy: PremiumPolicy = Depends(get_policy),
    draws: list[Draw] = Depends(get_all_draws_cached),
) -> Response:
    limit = policy.check_csv_export(user)
    content = draws_to_csv(draws, limit=limit)
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=lotolab-tirages.csv"},
    )


@router.get("/{draw_date}", response_model=Draw)
async def get_draw_by_date(
    draw_date: date, repository: Repository = Depends(get_repository)
) -> Draw:
    draw = await repository.get_draw_by_date(draw_date)
    if draw is None:
        raise NotFoundError("Aucun tirage à cette date.")
    return draw
