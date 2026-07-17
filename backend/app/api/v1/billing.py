"""Webhook Stripe (paiement web).

Point d'entrée public — pas d'authentification utilisateur, la confiance
vient exclusivement de la vérification de signature Stripe. La création de
session de paiement vit dans `users.py`, à côté de `submit_receipt`
(mobile) : voir `POST /api/v1/me/premium/checkout`.
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, Request

from ...core.config import Settings, get_settings
from ...core.errors import AppError
from ...core.logging import get_logger
from ...db.repository import Repository
from ..deps import get_repository

router = APIRouter(prefix="/billing", tags=["Paiements"])
logger = get_logger(__name__)


@router.post("/stripe/webhook", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
    settings: Settings = Depends(get_settings),
    repository: Repository = Depends(get_repository),
) -> dict:
    """Réception des événements Stripe (signature vérifiée, jamais de confiance
    dans le corps brut sans elle)."""
    if not settings.stripe_enabled:
        raise AppError("stripe_not_configured", "Stripe n'est pas configuré.", 501)

    import stripe

    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.stripe_webhook_secret
        )
    except (ValueError, stripe.SignatureVerificationError) as exc:
        raise AppError("stripe_invalid_signature", "Signature Stripe invalide.", 400) from exc

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(repository, data)
    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(repository, data)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(repository, data)

    return {"received": True}


async def _handle_checkout_completed(repository: Repository, session: dict) -> None:
    metadata = session.get("metadata") or {}
    user_id = session.get("client_reference_id") or metadata.get("user_id")
    product = metadata.get("product")
    if not user_id or not product:
        logger.warning("Webhook Stripe checkout.session.completed sans user_id/product exploitable.")
        return
    # Abonnement : l'ID de subscription sert de référence pour les événements
    # de cycle de vie suivants. Achat unique (lifetime) : l'ID de session suffit,
    # aucun renouvellement à suivre.
    receipt_ref = session.get("subscription") or session["id"]
    await repository.grant_entitlement(
        user_id=user_id,
        product=product,
        platform="stripe",
        status="active",
        receipt_ref=receipt_ref,
        expires_at=None,
    )


async def _handle_subscription_updated(repository: Repository, subscription: dict) -> None:
    entitlement = await repository.get_entitlement_by_receipt_ref(subscription["id"])
    if entitlement is None:
        return
    status = "active" if subscription.get("status") in ("active", "trialing") else "revoked"
    # Depuis l'API Stripe « Basil » (2025-03-31), la période de facturation vit
    # sur chaque ligne d'abonnement (`items`), plus sur l'abonnement lui-même.
    items = (subscription.get("items") or {}).get("data") or []
    period_end = items[0].get("current_period_end") if items else None
    expires_at = datetime.fromtimestamp(period_end, tz=UTC).isoformat() if period_end else None
    await repository.update_entitlement(entitlement["id"], status=status, expires_at=expires_at)


async def _handle_subscription_deleted(repository: Repository, subscription: dict) -> None:
    entitlement = await repository.get_entitlement_by_receipt_ref(subscription["id"])
    if entitlement is not None:
        await repository.revoke_entitlement(entitlement["id"])
