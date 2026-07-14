"""Tests d'intégration de l'API (client HTTP complet, dépôt mémoire)."""

from .conftest import PREMIUM_ID, USER_ID, auth_header

CSV_UPLOAD = "date,n1,n2,n3,n4,n5,chance\n2021-05-01,2,13,27,38,44,3\n"


# ------------------------------------------------------------------ santé & erreurs
def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_latest_draw_404_when_empty(client):
    response = client.get("/api/v1/draws/latest")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_validation_error_format(client):
    response = client.get("/api/v1/draws?page=0")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


# ------------------------------------------------------------------ tirages
def test_list_and_get_draws(seeded_client):
    response = seeded_client.get("/api/v1/draws?page=1&page_size=10")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 30
    assert len(body["items"]) == 10
    # tri décroissant
    dates = [item["draw_date"] for item in body["items"]]
    assert dates == sorted(dates, reverse=True)

    latest = seeded_client.get("/api/v1/draws/latest").json()
    detail = seeded_client.get(f"/api/v1/draws/{latest['draw_date']}")
    assert detail.status_code == 200
    assert detail.json()["numbers"] == latest["numbers"]


def test_year_filter(seeded_client):
    response = seeded_client.get("/api/v1/draws?year=2020")
    assert response.status_code == 200
    assert all(item["draw_date"].startswith("2020") for item in response.json()["items"])


# ------------------------------------------------------------------ statistiques
def test_stats_endpoints_include_disclaimer(seeded_client):
    for path in ["overview", "frequencies", "delays", "gaps", "pairs", "shapes"]:
        response = seeded_client.get(f"/api/v1/stats/{path}")
        assert response.status_code == 200, path
        assert "disclaimer" in response.json(), path


def test_stats_window(seeded_client):
    full = seeded_client.get("/api/v1/stats/frequencies").json()
    windowed = seeded_client.get("/api/v1/stats/frequencies?window=10").json()
    assert full["draw_count"] == 30
    assert windowed["draw_count"] == 10


def test_advanced_stats_require_premium(seeded_client):
    assert seeded_client.get("/api/v1/stats/triplets").status_code == 402
    assert (
        seeded_client.get("/api/v1/stats/triplets", headers=auth_header(USER_ID)).status_code
        == 402
    )
    assert (
        seeded_client.get("/api/v1/stats/triplets", headers=auth_header(PREMIUM_ID)).status_code
        == 200
    )
    assert (
        seeded_client.get("/api/v1/stats/compare", headers=auth_header(PREMIUM_ID)).status_code
        == 200
    )


def test_monte_carlo_iterations_capped_by_tier(seeded_client):
    anonymous = seeded_client.get("/api/v1/stats/monte-carlo?iterations=999999&seed=1").json()
    assert anonymous["iterations"] == 1000
    premium = seeded_client.get(
        "/api/v1/stats/monte-carlo?iterations=50000&seed=1", headers=auth_header(PREMIUM_ID)
    ).json()
    assert premium["iterations"] == 50000


def test_number_profile(seeded_client):
    response = seeded_client.get("/api/v1/stats/numbers/7")
    assert response.status_code == 200
    assert response.json()["number"] == 7


# ------------------------------------------------------------------ générateur
def test_generator_anonymous_limited_to_random_single(seeded_client):
    ok = seeded_client.post("/api/v1/generator", json={"method": "random", "count": 1, "seed": 1})
    assert ok.status_code == 200
    grid = ok.json()["grids"][0]
    assert len(grid["numbers"]) == 5
    assert "probabilité" in ok.json()["warning"]

    refused = seeded_client.post("/api/v1/generator", json={"method": "delay", "count": 1})
    assert refused.status_code == 402
    refused_count = seeded_client.post("/api/v1/generator", json={"method": "random", "count": 3})
    assert refused_count.status_code == 402


def test_generator_free_and_premium_tiers(seeded_client):
    free_ok = seeded_client.post(
        "/api/v1/generator",
        json={"method": "frequency", "count": 3, "seed": 2},
        headers=auth_header(USER_ID),
    )
    assert free_ok.status_code == 200

    free_refused = seeded_client.post(
        "/api/v1/generator",
        json={"method": "diversified", "count": 3},
        headers=auth_header(USER_ID),
    )
    assert free_refused.status_code == 402

    premium_ok = seeded_client.post(
        "/api/v1/generator",
        json={"method": "diversified", "count": 10, "seed": 3},
        headers=auth_header(PREMIUM_ID),
    )
    assert premium_ok.status_code == 200
    assert len(premium_ok.json()["grids"]) == 10


# ------------------------------------------------------------------ authentification
def test_invalid_token_rejected(client):
    response = client.get("/api/v1/me", headers={"Authorization": "Bearer contrefait"})
    assert response.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/v1/me").status_code == 401


def test_me_profile(seeded_client):
    response = seeded_client.get("/api/v1/me", headers=auth_header(USER_ID))
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "user"
    assert body["is_premium"] is False

    premium = seeded_client.get("/api/v1/me", headers=auth_header(PREMIUM_ID)).json()
    assert premium["is_premium"] is True


# ------------------------------------------------------------------ compte : grilles, favoris, préférences
def test_saved_grids_free_limit(seeded_client):
    headers = auth_header(USER_ID)
    payload = {"numbers": [1, 2, 3, 4, 5], "chance": 1, "method": "manual"}
    for _ in range(5):
        assert (
            seeded_client.post("/api/v1/me/grids", json=payload, headers=headers).status_code
            == 201
        )
    sixth = seeded_client.post("/api/v1/me/grids", json=payload, headers=headers)
    assert sixth.status_code == 402

    grids = seeded_client.get("/api/v1/me/grids", headers=headers).json()
    assert len(grids) == 5

    delete = seeded_client.delete(f"/api/v1/me/grids/{grids[0]['id']}", headers=headers)
    assert delete.status_code == 204


def test_favorites_crud(seeded_client):
    headers = auth_header(USER_ID)
    assert (
        seeded_client.post(
            "/api/v1/me/favorites", json={"number": 7, "is_chance": False}, headers=headers
        ).status_code
        == 201
    )
    duplicate = seeded_client.post(
        "/api/v1/me/favorites", json={"number": 7, "is_chance": False}, headers=headers
    )
    assert duplicate.status_code == 409
    favorites = seeded_client.get("/api/v1/me/favorites", headers=headers).json()
    assert len(favorites) == 1


def test_preferences_upsert(seeded_client):
    headers = auth_header(USER_ID)
    response = seeded_client.put(
        "/api/v1/me/preferences",
        json={"theme": "dark", "consent_ads": True},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["theme"] == "dark"
    assert response.json()["consent_updated_at"] is not None


# ------------------------------------------------------------------ RGPD
def test_gdpr_export_and_delete(seeded_client):
    headers = auth_header(USER_ID)
    seeded_client.post(
        "/api/v1/me/grids",
        json={"numbers": [1, 2, 3, 4, 5], "chance": 1, "method": "manual"},
        headers=headers,
    )
    export = seeded_client.get("/api/v1/me/export", headers=headers)
    assert export.status_code == 200
    assert len(export.json()["saved_grids"]) == 1

    refused = seeded_client.request(
        "DELETE", "/api/v1/me", json={"confirm": "non"}, headers=headers
    )
    assert refused.status_code == 400

    deleted = seeded_client.request(
        "DELETE", "/api/v1/me", json={"confirm": "SUPPRIMER"}, headers=headers
    )
    assert deleted.status_code == 204


# ------------------------------------------------------------------ exports
def test_csv_export_requires_account(seeded_client):
    assert seeded_client.get("/api/v1/draws/export.csv").status_code == 401
    free = seeded_client.get("/api/v1/draws/export.csv", headers=auth_header(USER_ID))
    assert free.status_code == 200
    assert free.headers["content-type"].startswith("text/csv")


def test_pdf_export_premium_only(seeded_client):
    refused = seeded_client.get("/api/v1/stats/report.pdf", headers=auth_header(USER_ID))
    assert refused.status_code == 402
    allowed = seeded_client.get("/api/v1/stats/report.pdf", headers=auth_header(PREMIUM_ID))
    assert allowed.status_code == 200
    assert allowed.headers["content-type"] == "application/pdf"
    assert allowed.content[:4] == b"%PDF"


# ------------------------------------------------------------------ achats intégrés
def test_receipt_validation_disabled_returns_501(seeded_client):
    response = seeded_client.post(
        "/api/v1/me/premium/receipt",
        json={"platform": "google_play", "product": "yearly", "receipt": "jeton-test"},
        headers=auth_header(USER_ID),
    )
    assert response.status_code == 501
    assert response.json()["error"]["code"] == "store_validation_disabled"
