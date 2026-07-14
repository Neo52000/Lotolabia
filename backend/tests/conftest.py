"""Fixtures de test.

IMPORTANT : tous les tirages utilisés ici sont des FIXTURES DE TEST fictives,
clairement identifiées — jamais des résultats officiels.
"""

import os
from datetime import date, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SUPABASE_JWT_SECRET", "secret-de-test-uniquement")
os.environ.setdefault("RATE_LIMIT_DEFAULT", "10000/minute")

from app.core.config import get_settings  # noqa: E402
from app.main import create_app  # noqa: E402
from app.schemas.draws import DrawCreate  # noqa: E402

TEST_SECRET = "secret-de-test-uniquement"
USER_ID = "11111111-1111-1111-1111-111111111111"
ADMIN_ID = "22222222-2222-2222-2222-222222222222"
PREMIUM_ID = "33333333-3333-3333-3333-333333333333"


def make_token(user_id: str, email: str = "test@example.com") -> str:
    return jwt.encode({"sub": user_id, "email": email}, TEST_SECRET, algorithm="HS256")


def auth_header(user_id: str) -> dict:
    return {"Authorization": f"Bearer {make_token(user_id)}"}


def fixture_draws(count: int = 30) -> list[DrawCreate]:
    """Génère des tirages fictifs déterministes (fixtures de test)."""
    draws = []
    base = date(2020, 1, 4)
    for index in range(count):
        offset = index * 7
        numbers = sorted(
            {
                1 + (index * 3) % 49,
                1 + (index * 7 + 5) % 49,
                1 + (index * 11 + 10) % 49,
                1 + (index * 13 + 20) % 49,
                1 + (index * 17 + 30) % 49,
            }
        )
        # complète si collisions du générateur déterministe
        candidate = 1
        while len(numbers) < 5:
            if candidate not in numbers:
                numbers.append(candidate)
            candidate += 1
        draws.append(
            DrawCreate(
                draw_date=base + timedelta(days=offset),
                numbers=sorted(numbers)[:5],
                chance=1 + index % 10,
                source="test_fixture",
            )
        )
    return draws


@pytest.fixture()
def client():
    get_settings.cache_clear()
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def repo(client):
    return client.app.state.repository


@pytest.fixture()
def seeded_client(client, repo):
    """Client avec 30 tirages fictifs + un utilisateur, un premium et un admin."""
    import anyio

    async def seed():
        await repo.insert_draws(fixture_draws(30))
        await repo.set_profile_role(USER_ID, "user")
        await repo.set_profile_role(ADMIN_ID, "admin")
        await repo.set_profile_role(PREMIUM_ID, "user")
        await repo.grant_entitlement(
            user_id=PREMIUM_ID, product="lifetime", platform="manual", expires_at=None
        )

    anyio.run(seed)
    client.app.state.cache.clear()
    return client
