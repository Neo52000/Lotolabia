"""Endpoints du compte utilisateur : profil, préférences, favoris, grilles,
notifications, Premium et droits RGPD (export / suppression)."""

from datetime import UTC
from typing import Any, Literal

from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel, Field

from ...core.errors import AppError
from ...core.security import AuthUser, require_user
from ...db.repository import Repository
from ...schemas.grids import SavedGrid, SavedGridCreate
from ...services.premium import PremiumPolicy
from ..deps import get_policy, get_repository

router = APIRouter(prefix="/me", tags=["Compte"])


class PreferencesUpdate(BaseModel):
    theme: str | None = Field(default=None, pattern="^(system|light|dark)$")
    language: str | None = Field(default=None, max_length=5)
    notifications_enabled: bool | None = None
    notify_new_draw: bool | None = None
    notification_weekly_limit: int | None = Field(default=None, ge=0, le=10)
    consent_ads: bool | None = None
    consent_analytics: bool | None = None


class FavoriteRequest(BaseModel):
    number: int = Field(ge=1, le=49)
    is_chance: bool = False


@router.get("")
async def my_profile(
    user: AuthUser = Depends(require_user),
    repository: Repository = Depends(get_repository),
) -> dict:
    profile = await repository.get_profile(user.id)
    return {
        "id": user.id,
        "email": user.email,
        "display_name": (profile or {}).get("display_name"),
        "role": user.role,
        "is_premium": user.is_premium,
    }


@router.get("/preferences")
async def my_preferences(
    user: AuthUser = Depends(require_user),
    repository: Repository = Depends(get_repository),
) -> dict:
    return await repository.get_preferences(user.id) or {"user_id": user.id}


@router.put("/preferences")
async def update_preferences(
    update: PreferencesUpdate,
    user: AuthUser = Depends(require_user),
    repository: Repository = Depends(get_repository),
) -> dict:
    data = update.model_dump(exclude_none=True)
    if {"consent_ads", "consent_analytics"} & data.keys():
        from datetime import datetime

        data["consent_updated_at"] = datetime.now(UTC).isoformat()
    return await repository.upsert_preferences(user.id, data)


@router.get("/grids", response_model=list[SavedGrid])
async def my_grids(
    user: AuthUser = Depends(require_user),
    repository: Repository = Depends(get_repository),
) -> list[SavedGrid]:
    rows = await repository.list_saved_grids(user.id)
    return [SavedGrid(**{k: v for k, v in row.items() if k in SavedGrid.model_fields}) for row in rows]


@router.post("/grids", response_model=SavedGrid, status_code=201)
async def save_grid(
    grid: SavedGridCreate,
    user: AuthUser = Depends(require_user),
    repository: Repository = Depends(get_repository),
    policy: PremiumPolicy = Depends(get_policy),
) -> SavedGrid:
    limit = policy.saved_grids_limit(user)
    if limit is not None and await repository.count_saved_grids(user.id) >= limit:
        raise AppError(
            "grid_limit_reached",
            f"L'offre gratuite est limitée à {limit} grilles enregistrées. "
            "Passez à Premium pour un nombre illimité.",
            402,
        )
    row = await repository.create_saved_grid(user.id, grid.model_dump())
    return SavedGrid(**{k: v for k, v in row.items() if k in SavedGrid.model_fields})


@router.delete("/grids/{grid_id}", status_code=204)
async def delete_grid(
    grid_id: int,
    user: AuthUser = Depends(require_user),
    repository: Repository = Depends(get_repository),
) -> None:
    await repository.delete_saved_grid(user.id, grid_id)


@router.get("/favorites")
async def my_favorites(
    user: AuthUser = Depends(require_user),
    repository: Repository = Depends(get_repository),
) -> list[dict]:
    return await repository.list_favorites(user.id)


@router.post("/favorites", status_code=201)
async def add_favorite(
    favorite: FavoriteRequest,
    user: AuthUser = Depends(require_user),
    repository: Repository = Depends(get_repository),
) -> dict:
    if favorite.is_chance and favorite.number > 10:
        raise AppError("invalid_number", "Le numéro Chance est compris entre 1 et 10.")
    return await repository.add_favorite(user.id, favorite.number, favorite.is_chance)


@router.delete("/favorites", status_code=204)
async def remove_favorite(
    favorite: FavoriteRequest,
    user: AuthUser = Depends(require_user),
    repository: Repository = Depends(get_repository),
) -> None:
    await repository.remove_favorite(user.id, favorite.number, favorite.is_chance)


@router.get("/notifications")
async def my_notifications(
    user: AuthUser = Depends(require_user),
    repository: Repository = Depends(get_repository),
) -> list[dict]:
    return await repository.list_notifications(user.id)


@router.post("/notifications/{notification_id}/read", status_code=204)
async def mark_read(
    notification_id: int,
    user: AuthUser = Depends(require_user),
    repository: Repository = Depends(get_repository),
) -> None:
    await repository.mark_notification_read(user.id, notification_id)


@router.get("/premium")
async def my_premium(
    user: AuthUser = Depends(require_user),
    repository: Repository = Depends(get_repository),
) -> dict:
    return {
        "is_premium": user.is_premium,
        "entitlements": await repository.list_entitlements(user.id),
    }


class ReceiptSubmission(BaseModel):
    platform: str = Field(pattern="^(google_play|app_store)$")
    product: str = Field(pattern="^(monthly|yearly|lifetime)$")
    receipt: str = Field(max_length=20_000, description="Jeton d'achat / reçu émis par le store")


@router.post("/premium/receipt", status_code=202)
async def submit_receipt(
    submission: ReceiptSubmission,
    user: AuthUser = Depends(require_user),
) -> dict:
    """Validation d'un reçu d'achat (Google Play / App Store).

    Prévu techniquement mais désactivé tant que les identifiants des consoles
    ne sont pas configurés (STORE_VALIDATION_ENABLED + clés en variables
    d'environnement). Aucun droit n'est accordé sans validation réelle du reçu
    auprès du store — jamais de validation simulée.
    """
    from ...core.config import get_settings

    settings = get_settings()
    if not settings.store_validation_enabled:
        raise AppError(
            "store_validation_disabled",
            "La validation des achats n'est pas encore activée sur ce serveur. "
            "Voir docs/MONETISATION.md pour la configuration des stores.",
            501,
        )
    # Point d'intégration : validation serveur-à-serveur du reçu
    # (Google Play Developer API / App Store Server API), puis
    # repository.grant_entitlement(...) avec receipt_ref et expiration.
    raise AppError(
        "store_validation_not_implemented",
        "Validation des reçus à brancher avec les identifiants des consoles.",
        501,
    )


class CheckoutRequest(BaseModel):
    product: str = Field(pattern="^(monthly|yearly|lifetime)$")


@router.post("/premium/checkout", status_code=201)
async def create_checkout_session(
    body: CheckoutRequest,
    user: AuthUser = Depends(require_user),
) -> dict:
    """Crée une session Stripe Checkout pour l'offre demandée (paiement web).

    Le droit Premium n'est accordé qu'après confirmation du paiement par
    Stripe via le webhook `POST /api/v1/billing/stripe/webhook`
    (`checkout.session.completed`) — jamais à la création de la session.
    Désactivé tant que les clés Stripe ne sont pas configurées
    (`STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`).
    """
    from ...core.config import get_settings

    settings = get_settings()
    if not settings.stripe_enabled:
        raise AppError(
            "stripe_not_configured",
            "Le paiement Stripe n'est pas encore activé sur ce serveur.",
            501,
        )
    price_id = {
        "monthly": settings.stripe_price_monthly,
        "yearly": settings.stripe_price_yearly,
        "lifetime": settings.stripe_price_lifetime,
    }[body.product]
    if not price_id:
        raise AppError(
            "stripe_price_missing",
            f"Aucun prix Stripe configuré pour « {body.product} ».",
            501,
        )

    import stripe

    stripe.api_key = settings.stripe_secret_key
    mode: Literal["payment", "subscription"] = (
        "payment" if body.product == "lifetime" else "subscription"
    )
    create_kwargs: dict[str, Any] = {
        "mode": mode,
        "line_items": [{"price": price_id, "quantity": 1}],
        "client_reference_id": user.id,
        "metadata": {"user_id": user.id, "product": body.product},
        "success_url": f"{settings.site_url}/premium/succes?session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{settings.site_url}/premium/annule",
        "allow_promotion_codes": True,
    }
    if user.email:
        create_kwargs["customer_email"] = user.email
    session = stripe.checkout.Session.create(**create_kwargs)
    return {"checkout_url": session.url}


# --------------------------------------------------------------------- RGPD
@router.get("/export")
async def export_my_data(
    user: AuthUser = Depends(require_user),
    repository: Repository = Depends(get_repository),
) -> dict:
    """Export RGPD : la totalité des données détenues sur l'utilisateur."""
    return await repository.export_user_data(user.id)


@router.delete("", status_code=204)
async def delete_my_account(
    user: AuthUser = Depends(require_user),
    repository: Repository = Depends(get_repository),
    confirm: str = Body(..., embed=True),
) -> None:
    """Suppression définitive du compte et de toutes les données associées."""
    if confirm != "SUPPRIMER":
        raise AppError(
            "confirmation_required",
            'Confirmez la suppression en envoyant {"confirm": "SUPPRIMER"}.',
        )
    await repository.add_audit(
        actor_id=user.id,
        actor_email=user.email,
        action="account_self_delete",
        target_type="user",
        target_id=user.id,
    )
    await repository.delete_user_data(user.id)
