"""Tests du paiement web Stripe : session de paiement et webhook.

Le SDK Stripe n'est jamais appelé réellement — `stripe.checkout.Session.create`
et `stripe.Webhook.construct_event` sont remplacés par des doublures de test.
"""

import anyio
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app

from .conftest import USER_ID, auth_header


@pytest.fixture()
def stripe_client(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_fake")
    monkeypatch.setenv("STRIPE_PRICE_MONTHLY", "price_monthly_fake")
    monkeypatch.setenv("STRIPE_PRICE_YEARLY", "price_yearly_fake")
    monkeypatch.setenv("STRIPE_PRICE_LIFETIME", "price_lifetime_fake")
    monkeypatch.setenv("SITE_URL", "https://lotolab.example")
    get_settings.cache_clear()
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
    get_settings.cache_clear()


def test_checkout_disabled_without_stripe_keys(client):
    response = client.post(
        "/api/v1/me/premium/checkout",
        json={"product": "monthly"},
        headers=auth_header(USER_ID),
    )
    assert response.status_code == 501
    assert response.json()["error"]["code"] == "stripe_not_configured"


def test_checkout_requires_auth(stripe_client):
    response = stripe_client.post("/api/v1/me/premium/checkout", json={"product": "monthly"})
    assert response.status_code == 401


def test_checkout_creates_session(stripe_client, monkeypatch):
    import stripe

    captured = {}

    class FakeSession:
        url = "https://checkout.stripe.com/pay/cs_test_123"

    def fake_create(**kwargs):
        captured.update(kwargs)
        return FakeSession()

    monkeypatch.setattr(stripe.checkout.Session, "create", fake_create)

    response = stripe_client.post(
        "/api/v1/me/premium/checkout",
        json={"product": "monthly"},
        headers=auth_header(USER_ID),
    )
    assert response.status_code == 201
    assert response.json() == {"checkout_url": FakeSession.url}
    assert captured["mode"] == "subscription"
    assert captured["client_reference_id"] == USER_ID
    assert captured["metadata"] == {"user_id": USER_ID, "product": "monthly"}
    assert captured["line_items"] == [{"price": "price_monthly_fake", "quantity": 1}]


def test_checkout_lifetime_uses_payment_mode(stripe_client, monkeypatch):
    import stripe

    captured = {}

    class FakeSession:
        url = "https://checkout.stripe.com/pay/cs_test_456"

    def fake_create(**kwargs):
        captured.update(kwargs)
        return FakeSession()

    monkeypatch.setattr(stripe.checkout.Session, "create", fake_create)
    stripe_client.post(
        "/api/v1/me/premium/checkout",
        json={"product": "lifetime"},
        headers=auth_header(USER_ID),
    )
    assert captured["mode"] == "payment"


def _fake_event(event_type: str, data_object: dict) -> dict:
    return {"type": event_type, "data": {"object": data_object}}


def _run(coro_func, /, **kwargs):
    return anyio.run(lambda: coro_func(**kwargs))


def test_webhook_rejects_invalid_signature(stripe_client, monkeypatch):
    import stripe

    def fake_construct_event(payload, sig_header, secret):
        raise stripe.SignatureVerificationError("bad signature", sig_header)

    monkeypatch.setattr(stripe.Webhook, "construct_event", fake_construct_event)
    response = stripe_client.post(
        "/api/v1/billing/stripe/webhook",
        content=b"{}",
        headers={"Stripe-Signature": "t=1,v1=fake"},
    )
    assert response.status_code == 400


def test_webhook_checkout_completed_grants_entitlement(stripe_client, monkeypatch):
    import stripe

    session_obj = {
        "id": "cs_test_123",
        "subscription": "sub_test_123",
        "client_reference_id": USER_ID,
        "metadata": {"user_id": USER_ID, "product": "monthly"},
    }
    monkeypatch.setattr(
        stripe.Webhook,
        "construct_event",
        lambda payload, sig_header, secret: _fake_event("checkout.session.completed", session_obj),
    )
    response = stripe_client.post(
        "/api/v1/billing/stripe/webhook",
        content=b"{}",
        headers={"Stripe-Signature": "t=1,v1=fake"},
    )
    assert response.status_code == 200

    repository = stripe_client.app.state.repository
    entitlements = anyio.run(repository.list_entitlements, USER_ID)
    assert len(entitlements) == 1
    assert entitlements[0]["platform"] == "stripe"
    assert entitlements[0]["product"] == "monthly"
    assert entitlements[0]["status"] == "active"
    assert entitlements[0]["receipt_ref"] == "sub_test_123"

    is_premium = anyio.run(repository.has_active_premium, USER_ID)
    assert is_premium is True


def test_webhook_subscription_deleted_revokes_entitlement(stripe_client, monkeypatch):
    import stripe

    repository = stripe_client.app.state.repository
    entitlement_id = _run(
        repository.grant_entitlement,
        user_id=USER_ID,
        product="monthly",
        platform="stripe",
        status="active",
        receipt_ref="sub_test_456",
        expires_at=None,
    )

    monkeypatch.setattr(
        stripe.Webhook,
        "construct_event",
        lambda payload, sig_header, secret: _fake_event(
            "customer.subscription.deleted", {"id": "sub_test_456"}
        ),
    )
    response = stripe_client.post(
        "/api/v1/billing/stripe/webhook",
        content=b"{}",
        headers={"Stripe-Signature": "t=1,v1=fake"},
    )
    assert response.status_code == 200

    entitlements = anyio.run(repository.list_entitlements, USER_ID)
    entitlement = next(e for e in entitlements if e["id"] == entitlement_id)
    assert entitlement["status"] == "revoked"


def test_webhook_subscription_updated_sets_expiry(stripe_client, monkeypatch):
    import stripe

    repository = stripe_client.app.state.repository
    _run(
        repository.grant_entitlement,
        user_id=USER_ID,
        product="yearly",
        platform="stripe",
        status="active",
        receipt_ref="sub_test_789",
        expires_at=None,
    )

    subscription_obj = {
        "id": "sub_test_789",
        "status": "active",
        "items": {"data": [{"current_period_end": 4102444800}]},  # 2100-01-01
    }
    monkeypatch.setattr(
        stripe.Webhook,
        "construct_event",
        lambda payload, sig_header, secret: _fake_event(
            "customer.subscription.updated", subscription_obj
        ),
    )
    response = stripe_client.post(
        "/api/v1/billing/stripe/webhook",
        content=b"{}",
        headers={"Stripe-Signature": "t=1,v1=fake"},
    )
    assert response.status_code == 200

    entitlements = anyio.run(repository.list_entitlements, USER_ID)
    entitlement = next(e for e in entitlements if e["receipt_ref"] == "sub_test_789")
    assert entitlement["status"] == "active"
    assert entitlement["expires_at"].startswith("2100-01-01")
