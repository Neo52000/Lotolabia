"""Tests des endpoints d'administration : autorisations et journal d'audit."""


from .conftest import ADMIN_ID, USER_ID, auth_header

CSV_UPLOAD = "date,n1,n2,n3,n4,n5,chance\n2021-05-01,2,13,27,38,44,3\n"


def test_admin_endpoints_forbidden_for_users(seeded_client):
    assert seeded_client.get("/api/v1/admin/dashboard").status_code == 401
    assert (
        seeded_client.get("/api/v1/admin/dashboard", headers=auth_header(USER_ID)).status_code
        == 403
    )


def test_dashboard(seeded_client):
    response = seeded_client.get("/api/v1/admin/dashboard", headers=auth_header(ADMIN_ID))
    assert response.status_code == 200
    body = response.json()
    assert body["latest_draw_date"] is not None
    assert body["database_healthy"] is True


def test_manual_import_and_audit(seeded_client):
    headers = auth_header(ADMIN_ID)
    response = seeded_client.post(
        "/api/v1/admin/import/manual",
        files={"file": ("nouveaux.csv", CSV_UPLOAD.encode(), "text/csv")},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["imported"] == 1

    audit = seeded_client.get("/api/v1/admin/audit", headers=headers).json()
    assert any(entry["action"] == "manual_import" for entry in audit)

    imports = seeded_client.get("/api/v1/admin/imports", headers=headers).json()
    assert imports[0]["source"] == "manual"


def test_manual_import_rejects_bad_extension(seeded_client):
    response = seeded_client.post(
        "/api/v1/admin/import/manual",
        files={"file": ("script.exe", b"binaire", "application/octet-stream")},
        headers=auth_header(ADMIN_ID),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_file"


def test_sync_now_without_sources(seeded_client):
    response = seeded_client.post("/api/v1/admin/sync", headers=auth_header(ADMIN_ID))
    assert response.status_code == 200
    assert response.json()["status"] == "failed"  # aucune source configurée en test
    logs = seeded_client.get("/api/v1/admin/logs", headers=auth_header(ADMIN_ID)).json()
    assert any(log["level"] == "error" for log in logs)


def test_draw_crud_with_audit(seeded_client):
    headers = auth_header(ADMIN_ID)
    created = seeded_client.post(
        "/api/v1/admin/draws",
        json={"draw_date": "2021-06-05", "numbers": [4, 15, 23, 33, 42], "chance": 9},
        headers=headers,
    )
    assert created.status_code == 201
    draw_id = created.json()["id"]

    conflict = seeded_client.post(
        "/api/v1/admin/draws",
        json={"draw_date": "2021-06-05", "numbers": [1, 2, 3, 4, 5], "chance": 1},
        headers=headers,
    )
    assert conflict.status_code == 409

    updated = seeded_client.patch(
        f"/api/v1/admin/draws/{draw_id}", json={"chance": 2}, headers=headers
    )
    assert updated.status_code == 200
    assert updated.json()["chance"] == 2

    deleted = seeded_client.delete(f"/api/v1/admin/draws/{draw_id}", headers=headers)
    assert deleted.status_code == 204

    actions = [e["action"] for e in seeded_client.get("/api/v1/admin/audit", headers=headers).json()]
    assert {"draw_create", "draw_update", "draw_delete"}.issubset(set(actions))


def test_quarantine_review(seeded_client, repo):
    headers = auth_header(ADMIN_ID)
    bad_csv = "date,n1,n2,n3,n4,n5,chance\n2021-07-01,9,9,9,9,9,1\n"
    seeded_client.post(
        "/api/v1/admin/import/manual",
        files={"file": ("bad.csv", bad_csv.encode(), "text/csv")},
        headers=headers,
    )
    quarantine = seeded_client.get("/api/v1/admin/quarantine", headers=headers).json()
    assert len(quarantine) == 1
    item_id = quarantine[0]["id"]

    reject = seeded_client.post(f"/api/v1/admin/quarantine/{item_id}/reject", headers=headers)
    assert reject.status_code == 204
    assert seeded_client.get("/api/v1/admin/quarantine", headers=headers).json() == []


def test_premium_grant_and_revoke(seeded_client):
    headers = auth_header(ADMIN_ID)
    granted = seeded_client.post(
        "/api/v1/admin/premium/grant",
        json={"user_id": USER_ID, "product": "yearly", "expires_at": "2099-01-01T00:00:00Z"},
        headers=headers,
    )
    assert granted.status_code == 201

    me = seeded_client.get("/api/v1/me", headers=auth_header(USER_ID)).json()
    assert me["is_premium"] is True

    revoked = seeded_client.delete(
        f"/api/v1/admin/premium/{granted.json()['id']}", headers=headers
    )
    assert revoked.status_code == 204
    me_after = seeded_client.get("/api/v1/me", headers=auth_header(USER_ID)).json()
    assert me_after["is_premium"] is False


def test_role_management(seeded_client):
    headers = auth_header(ADMIN_ID)
    promote = seeded_client.put(
        f"/api/v1/admin/users/{USER_ID}/role", json={"role": "admin"}, headers=headers
    )
    assert promote.status_code == 204
    assert (
        seeded_client.get("/api/v1/admin/dashboard", headers=auth_header(USER_ID)).status_code
        == 200
    )


def test_seo_and_ads_management(seeded_client):
    headers = auth_header(ADMIN_ID)
    seo = seeded_client.put(
        "/api/v1/admin/seo",
        json={"slug": "methodologie", "title": "Méthodologie", "body_md": "## Contenu", "published": True},
        headers=headers,
    )
    assert seo.status_code == 200
    assert len(seeded_client.get("/api/v1/admin/seo", headers=headers).json()) == 1

    ad = seeded_client.put(
        "/api/v1/admin/ads",
        json={"code": "home_banner", "name": "Bannière accueil", "enabled": False},
        headers=headers,
    )
    assert ad.status_code == 200


def test_system_status(seeded_client):
    response = seeded_client.get("/api/v1/admin/status", headers=auth_header(ADMIN_ID))
    assert response.status_code == 200
    body = response.json()
    assert body["database"] == "ok"
    assert body["supabase_configured"] is False
