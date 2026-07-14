"""Endpoints d'administration (back-office).

Tous les endpoints exigent le rôle admin, et toutes les actions sensibles
sont journalisées dans `audit_log`.
"""

from pathlib import PurePosixPath

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from pydantic import BaseModel, Field, field_validator

from ...collector.service import ALLOWED_UPLOAD_EXTENSIONS, CollectorService
from ...core.config import Settings, get_settings
from ...core.errors import AppError, NotFoundError
from ...core.security import AuthUser, require_admin
from ...db.repository import Repository
from ...schemas.draws import Draw, DrawCreate, validate_chance_number, validate_main_numbers
from ..deps import get_repository

router = APIRouter(prefix="/admin", tags=["Administration"], dependencies=[Depends(require_admin)])


def get_collector(request: Request) -> CollectorService:
    return request.app.state.collector


async def _audit(
    repository: Repository,
    admin: AuthUser,
    action: str,
    target_type: str | None = None,
    target_id: str | None = None,
    details: dict | None = None,
) -> None:
    await repository.add_audit(
        actor_id=admin.id,
        actor_email=admin.email,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )


# ------------------------------------------------------------------ tableau de bord
@router.get("/dashboard")
async def dashboard(
    request: Request,
    repository: Repository = Depends(get_repository),
) -> dict:
    jobs = await repository.list_import_jobs(limit=1)
    latest = await repository.latest_draw()
    quarantine = await repository.list_quarantine("pending")
    scheduler = getattr(request.app.state, "scheduler", None)
    return {
        "latest_draw_date": latest.draw_date.isoformat() if latest else None,
        "last_import": jobs[0] if jobs else None,
        "pending_quarantine": len(quarantine),
        "next_scheduled_runs": scheduler.next_runs() if scheduler else [],
        "api_healthy": True,
        "database_healthy": await repository.ping(),
    }


# ------------------------------------------------------------------ synchronisation
@router.post("/sync")
async def sync_now(
    request: Request,
    admin: AuthUser = Depends(require_admin),
    repository: Repository = Depends(get_repository),
    collector: CollectorService = Depends(get_collector),
) -> dict:
    """Bouton « Synchroniser maintenant » du back-office."""
    await _audit(repository, admin, "sync_now")
    result = await collector.run_scheduled_sync(triggered_by="admin")
    request.app.state.cache.clear()
    return result


@router.post("/import/manual")
async def manual_import(
    request: Request,
    file: UploadFile = File(...),
    admin: AuthUser = Depends(require_admin),
    repository: Repository = Depends(get_repository),
    collector: CollectorService = Depends(get_collector),
    settings: Settings = Depends(get_settings),
) -> dict:
    extension = PurePosixPath(file.filename or "").suffix.lower()
    if extension not in ALLOWED_UPLOAD_EXTENSIONS:
        raise AppError("invalid_file", "Seuls les fichiers .csv et .zip sont acceptés.")
    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise AppError("file_too_large", "Fichier trop volumineux (5 Mo maximum).", 413)
    await _audit(repository, admin, "manual_import", details={"filename": file.filename})
    result = await collector.import_manual_file(content, file.filename or "import.csv", admin.id)
    request.app.state.cache.clear()
    return result


@router.get("/imports")
async def list_imports(
    limit: int = Query(50, ge=1, le=200),
    repository: Repository = Depends(get_repository),
) -> list[dict]:
    return await repository.list_import_jobs(limit=limit)


@router.get("/logs")
async def list_logs(
    job_id: int | None = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    repository: Repository = Depends(get_repository),
) -> list[dict]:
    return await repository.list_sync_logs(job_id=job_id, limit=limit)


# ------------------------------------------------------------------ quarantaine
@router.get("/quarantine")
async def list_quarantine(
    status: str = Query("pending", pattern="^(pending|approved|rejected)$"),
    repository: Repository = Depends(get_repository),
) -> list[dict]:
    return await repository.list_quarantine(status)


@router.post("/quarantine/{item_id}/approve")
async def approve_quarantine(
    item_id: int,
    request: Request,
    admin: AuthUser = Depends(require_admin),
    repository: Repository = Depends(get_repository),
    collector: CollectorService = Depends(get_collector),
) -> dict:
    await _audit(repository, admin, "quarantine_approve", "quarantine", str(item_id))
    result = await collector.approve_quarantined(item_id, admin.id)
    request.app.state.cache.clear()
    return result


@router.post("/quarantine/{item_id}/reject", status_code=204)
async def reject_quarantine(
    item_id: int,
    admin: AuthUser = Depends(require_admin),
    repository: Repository = Depends(get_repository),
) -> None:
    if await repository.get_quarantine(item_id) is None:
        raise NotFoundError("Élément de quarantaine introuvable.")
    await _audit(repository, admin, "quarantine_reject", "quarantine", str(item_id))
    await repository.review_quarantine(item_id, "rejected", admin.id)


# ------------------------------------------------------------------ gestion des tirages
class DrawUpdate(BaseModel):
    numbers: list[int] | None = Field(default=None, min_length=5, max_length=5)
    chance: int | None = None

    @field_validator("numbers")
    @classmethod
    def _numbers(cls, values: list[int] | None) -> list[int] | None:
        return validate_main_numbers(values) if values is not None else None

    @field_validator("chance")
    @classmethod
    def _chance(cls, value: int | None) -> int | None:
        return validate_chance_number(value) if value is not None else None


@router.post("/draws", response_model=Draw, status_code=201)
async def create_draw(
    draw: DrawCreate,
    request: Request,
    admin: AuthUser = Depends(require_admin),
    repository: Repository = Depends(get_repository),
) -> Draw:
    existing = await repository.get_draw_by_date(draw.draw_date)
    if existing is not None:
        raise AppError("conflict", "Un tirage existe déjà à cette date.", 409)
    draw.source = "admin"
    inserted, _ = await repository.insert_draws([draw])
    if inserted == 0:
        raise AppError("conflict", "Un tirage existe déjà à cette date.", 409)
    await _audit(
        repository, admin, "draw_create", "draw", draw.draw_date.isoformat(),
        details={"numbers": draw.numbers, "chance": draw.chance},
    )
    request.app.state.cache.clear()
    created = await repository.get_draw_by_date(draw.draw_date)
    assert created is not None
    return created


@router.patch("/draws/{draw_id}", response_model=Draw)
async def update_draw(
    draw_id: int,
    update: DrawUpdate,
    request: Request,
    admin: AuthUser = Depends(require_admin),
    repository: Repository = Depends(get_repository),
) -> Draw:
    data = update.model_dump(exclude_none=True)
    if not data:
        raise AppError("empty_update", "Aucune modification fournie.")
    await _audit(repository, admin, "draw_update", "draw", str(draw_id), details=data)
    result = await repository.update_draw(draw_id, data)
    request.app.state.cache.clear()
    return result


@router.delete("/draws/{draw_id}", status_code=204)
async def delete_draw(
    draw_id: int,
    request: Request,
    admin: AuthUser = Depends(require_admin),
    repository: Repository = Depends(get_repository),
) -> None:
    await _audit(repository, admin, "draw_delete", "draw", str(draw_id))
    await repository.delete_draw(draw_id)
    request.app.state.cache.clear()


@router.post("/recalculate", status_code=202)
async def recalculate(
    request: Request,
    admin: AuthUser = Depends(require_admin),
    repository: Repository = Depends(get_repository),
) -> dict:
    """Vide tous les caches d'analyse : les statistiques sont recalculées à la demande."""
    await _audit(repository, admin, "recalculate_all")
    request.app.state.cache.clear()
    return {"status": "cache_cleared"}


# ------------------------------------------------------------------ utilisateurs / Premium
@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    repository: Repository = Depends(get_repository),
) -> dict:
    items, total = await repository.list_profiles(page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


class RoleUpdate(BaseModel):
    role: str = Field(pattern="^(user|admin)$")


@router.put("/users/{user_id}/role", status_code=204)
async def set_role(
    user_id: str,
    update: RoleUpdate,
    admin: AuthUser = Depends(require_admin),
    repository: Repository = Depends(get_repository),
) -> None:
    await _audit(repository, admin, "user_role_change", "user", user_id, details={"role": update.role})
    await repository.set_profile_role(user_id, update.role)


class EntitlementGrant(BaseModel):
    user_id: str
    product: str = Field(pattern="^(monthly|yearly|lifetime|trial)$")
    expires_at: str | None = None


@router.get("/premium")
async def list_premium(
    user_id: str | None = Query(None),
    repository: Repository = Depends(get_repository),
) -> list[dict]:
    return await repository.list_entitlements(user_id)


@router.post("/premium/grant", status_code=201)
async def grant_premium(
    grant: EntitlementGrant,
    admin: AuthUser = Depends(require_admin),
    repository: Repository = Depends(get_repository),
) -> dict:
    await _audit(
        repository, admin, "premium_grant", "user", grant.user_id, details=grant.model_dump()
    )
    entitlement_id = await repository.grant_entitlement(
        user_id=grant.user_id,
        product=grant.product,
        platform="manual",
        expires_at=grant.expires_at,
    )
    return {"id": entitlement_id}


@router.delete("/premium/{entitlement_id}", status_code=204)
async def revoke_premium(
    entitlement_id: int,
    admin: AuthUser = Depends(require_admin),
    repository: Repository = Depends(get_repository),
) -> None:
    await _audit(repository, admin, "premium_revoke", "entitlement", str(entitlement_id))
    await repository.revoke_entitlement(entitlement_id)


# ------------------------------------------------------------------ contenus SEO / publicités
class SeoContentUpsert(BaseModel):
    slug: str = Field(max_length=120, pattern="^[a-z0-9-]+$")
    title: str = Field(max_length=180)
    meta_description: str | None = Field(default=None, max_length=300)
    body_md: str = ""
    published: bool = False


@router.get("/seo")
async def list_seo(repository: Repository = Depends(get_repository)) -> list[dict]:
    return await repository.list_seo_contents()


@router.put("/seo")
async def upsert_seo(
    content: SeoContentUpsert,
    admin: AuthUser = Depends(require_admin),
    repository: Repository = Depends(get_repository),
) -> dict:
    await _audit(repository, admin, "seo_upsert", "seo_content", content.slug)
    return await repository.upsert_seo_content({**content.model_dump(), "updated_by": admin.id})


@router.delete("/seo/{slug}", status_code=204)
async def delete_seo(
    slug: str,
    admin: AuthUser = Depends(require_admin),
    repository: Repository = Depends(get_repository),
) -> None:
    await _audit(repository, admin, "seo_delete", "seo_content", slug)
    await repository.delete_seo_content(slug)


class AdPlacementUpsert(BaseModel):
    code: str = Field(max_length=60, pattern="^[a-z0-9_]+$")
    name: str = Field(max_length=120)
    enabled: bool = False
    network: str = Field(default="admob", pattern="^(admob|none)$")
    unit_id: str | None = None
    max_per_session: int = Field(default=1, ge=0, le=10)


@router.get("/ads")
async def list_ads(repository: Repository = Depends(get_repository)) -> list[dict]:
    return await repository.list_ad_placements()


@router.put("/ads")
async def upsert_ad(
    placement: AdPlacementUpsert,
    admin: AuthUser = Depends(require_admin),
    repository: Repository = Depends(get_repository),
) -> dict:
    await _audit(repository, admin, "ad_placement_upsert", "ad_placement", placement.code)
    return await repository.upsert_ad_placement(placement.model_dump())


# ------------------------------------------------------------------ journaux & état
@router.get("/audit")
async def list_audit(
    limit: int = Query(100, ge=1, le=500),
    repository: Repository = Depends(get_repository),
) -> list[dict]:
    return await repository.list_audit(limit=limit)


@router.get("/status")
async def system_status(
    request: Request,
    settings: Settings = Depends(get_settings),
    repository: Repository = Depends(get_repository),
) -> dict:
    scheduler = getattr(request.app.state, "scheduler", None)
    return {
        "environment": settings.environment,
        "version": settings.app_version,
        "database": "ok" if await repository.ping() else "unreachable",
        "supabase_configured": settings.supabase_configured,
        "scheduler_enabled": settings.scheduler_enabled,
        "scheduler_jobs": scheduler.next_runs() if scheduler else [],
        "collector_sources_configured": len(settings.collector_history_url_list),
        "backups": "gérées par Supabase (PITR/quotidiennes selon plan) — voir docs/SUPABASE.md",
    }
