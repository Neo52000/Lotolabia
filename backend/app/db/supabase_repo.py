"""Implémentation Supabase du dépôt de données via PostgREST.

Utilise httpx en asynchrone avec la clé service role (usage serveur strict).
Toutes les valeurs passent par des paramètres de requête PostgREST : aucune
concaténation SQL, pas d'injection possible.
"""

from datetime import UTC, date, datetime
from typing import Any

import httpx

from ..core.errors import ConflictError, NotFoundError, UpstreamError
from ..schemas.draws import Draw, DrawCreate


class SupabaseRepository:
    def __init__(self, supabase_url: str, service_role_key: str, timeout: float = 15.0) -> None:
        self._rest = f"{supabase_url.rstrip('/')}/rest/v1"
        self._auth_admin = f"{supabase_url.rstrip('/')}/auth/v1/admin"
        self._client = httpx.AsyncClient(
            timeout=timeout,
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
            },
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    # ------------------------------------------------------------------ utils
    async def _request(
        self,
        method: str,
        table: str,
        *,
        params: dict | None = None,
        json_body: Any = None,
        headers: dict | None = None,
        base: str | None = None,
    ) -> httpx.Response:
        url = f"{base or self._rest}/{table}"
        try:
            response = await self._client.request(
                method, url, params=params, json=json_body, headers=headers
            )
        except httpx.HTTPError as exc:
            raise UpstreamError(f"Base de données injoignable ({type(exc).__name__}).") from exc
        if response.status_code == 409:
            raise ConflictError("Conflit avec une ressource existante.")
        if response.status_code >= 400:
            raise UpstreamError(f"Erreur base de données (HTTP {response.status_code}).")
        return response

    async def _select(self, table: str, params: dict) -> list[dict]:
        response = await self._request("GET", table, params=params)
        return response.json()

    async def _count(self, table: str, params: dict) -> int:
        response = await self._request(
            "GET",
            table,
            params={**params, "select": "id", "limit": 1},
            headers={"Prefer": "count=exact"},
        )
        content_range = response.headers.get("content-range", "*/0")
        return int(content_range.split("/")[-1])

    @staticmethod
    def _to_draw(row: dict) -> Draw:
        return Draw(
            id=row["id"],
            draw_date=date.fromisoformat(row["draw_date"]),
            numbers=list(row["numbers"]),
            chance=row["chance"],
            draw_type=row.get("draw_type", "loto"),
            source=row.get("source", "manual"),
            source_url=row.get("source_url"),
            retrieved_at=row.get("retrieved_at"),
        )

    # ----------------------------------------------------------------- tirages
    async def list_draws(
        self, page: int, page_size: int, year: int | None = None, month: int | None = None
    ) -> tuple[list[Draw], int]:
        params: dict = {"select": "*", "order": "draw_date.desc"}
        filters = []
        if year is not None:
            start = date(year, month or 1, 1)
            if month is not None:
                end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
            else:
                end = date(year + 1, 1, 1)
            filters = [("draw_date", f"gte.{start.isoformat()}"), ("draw_date", f"lt.{end.isoformat()}")]
        for key, value in filters:
            params.setdefault(key, value)
        count_params = {k: v for k, v in params.items() if k != "order"}
        total = await self._count("draws", count_params)
        params["offset"] = (page - 1) * page_size
        params["limit"] = page_size
        rows = await self._select("draws", params)
        return [self._to_draw(row) for row in rows], total

    async def all_draws(self) -> list[Draw]:
        rows: list[dict] = []
        offset = 0
        chunk = 1000
        while True:
            batch = await self._select(
                "draws",
                {"select": "*", "order": "draw_date.asc", "offset": offset, "limit": chunk},
            )
            rows.extend(batch)
            if len(batch) < chunk:
                break
            offset += chunk
        return [self._to_draw(row) for row in rows]

    async def get_draw_by_date(self, draw_date: date) -> Draw | None:
        rows = await self._select(
            "draws", {"select": "*", "draw_date": f"eq.{draw_date.isoformat()}", "limit": 1}
        )
        return self._to_draw(rows[0]) if rows else None

    async def get_draw(self, draw_id: int) -> Draw | None:
        rows = await self._select("draws", {"select": "*", "id": f"eq.{draw_id}", "limit": 1})
        return self._to_draw(rows[0]) if rows else None

    async def latest_draw(self) -> Draw | None:
        rows = await self._select(
            "draws", {"select": "*", "order": "draw_date.desc", "limit": 1}
        )
        return self._to_draw(rows[0]) if rows else None

    async def insert_draws(self, draws: list[DrawCreate]) -> tuple[int, int]:
        if not draws:
            return 0, 0
        payload = [
            {
                "draw_date": item.draw_date.isoformat(),
                "numbers": item.numbers,
                "chance": item.chance,
                "source": item.source,
                "source_url": item.source_url,
                "retrieved_at": datetime.now(UTC).isoformat(),
            }
            for item in draws
        ]
        # ignore-duplicates : les doublons (même date) sont silencieusement ignorés
        response = await self._request(
            "POST",
            "draws",
            json_body=payload,
            headers={
                "Prefer": "resolution=ignore-duplicates,return=representation",
            },
            params={"on_conflict": "draw_date,draw_type"},
        )
        inserted = len(response.json())
        return inserted, len(draws) - inserted

    async def update_draw(self, draw_id: int, data: dict) -> Draw:
        if "draw_date" in data and isinstance(data["draw_date"], date):
            data["draw_date"] = data["draw_date"].isoformat()
        response = await self._request(
            "PATCH",
            "draws",
            params={"id": f"eq.{draw_id}"},
            json_body=data,
            headers={"Prefer": "return=representation"},
        )
        rows = response.json()
        if not rows:
            raise NotFoundError("Tirage introuvable.")
        return self._to_draw(rows[0])

    async def delete_draw(self, draw_id: int) -> None:
        response = await self._request(
            "DELETE",
            "draws",
            params={"id": f"eq.{draw_id}"},
            headers={"Prefer": "return=representation"},
        )
        if not response.json():
            raise NotFoundError("Tirage introuvable.")

    # ------------------------------------------------------------------ import
    async def create_import_job(self, **fields: Any) -> int:
        response = await self._request(
            "POST", "import_jobs", json_body=fields, headers={"Prefer": "return=representation"}
        )
        return response.json()[0]["id"]

    async def update_import_job(self, job_id: int, **fields: Any) -> None:
        await self._request(
            "PATCH", "import_jobs", params={"id": f"eq.{job_id}"}, json_body=fields
        )

    async def list_import_jobs(self, limit: int = 50) -> list[dict]:
        return await self._select(
            "import_jobs", {"select": "*", "order": "created_at.desc", "limit": limit}
        )

    async def add_quarantine(self, job_id: int | None, raw_data: dict, reason: str) -> int:
        response = await self._request(
            "POST",
            "import_quarantine",
            json_body={"job_id": job_id, "raw_data": raw_data, "reason": reason},
            headers={"Prefer": "return=representation"},
        )
        return response.json()[0]["id"]

    async def list_quarantine(self, status: str = "pending") -> list[dict]:
        return await self._select(
            "import_quarantine",
            {"select": "*", "status": f"eq.{status}", "order": "created_at.desc"},
        )

    async def get_quarantine(self, item_id: int) -> dict | None:
        rows = await self._select(
            "import_quarantine", {"select": "*", "id": f"eq.{item_id}", "limit": 1}
        )
        return rows[0] if rows else None

    async def review_quarantine(self, item_id: int, status: str, reviewer_id: str) -> None:
        await self._request(
            "PATCH",
            "import_quarantine",
            params={"id": f"eq.{item_id}"},
            json_body={
                "status": status,
                "reviewed_by": reviewer_id,
                "reviewed_at": datetime.now(UTC).isoformat(),
            },
        )

    async def add_sync_log(
        self, job_id: int | None, level: str, message: str, context: dict | None = None
    ) -> None:
        await self._request(
            "POST",
            "sync_logs",
            json_body={"job_id": job_id, "level": level, "message": message, "context": context},
        )

    async def list_sync_logs(self, job_id: int | None = None, limit: int = 200) -> list[dict]:
        params: dict = {"select": "*", "order": "created_at.desc", "limit": limit}
        if job_id is not None:
            params["job_id"] = f"eq.{job_id}"
        return await self._select("sync_logs", params)

    # ------------------------------------------------------------ utilisateurs
    async def get_profile(self, user_id: str) -> dict | None:
        rows = await self._select("profiles", {"select": "*", "id": f"eq.{user_id}", "limit": 1})
        return rows[0] if rows else None

    async def list_profiles(self, page: int, page_size: int) -> tuple[list[dict], int]:
        total = await self._count("profiles", {})
        rows = await self._select(
            "profiles",
            {
                "select": "*",
                "order": "created_at.desc",
                "offset": (page - 1) * page_size,
                "limit": page_size,
            },
        )
        return rows, total

    async def set_profile_role(self, user_id: str, role: str) -> None:
        await self._request(
            "PATCH", "profiles", params={"id": f"eq.{user_id}"}, json_body={"role": role}
        )

    async def has_active_premium(self, user_id: str) -> bool:
        now = datetime.now(UTC).isoformat()
        rows = await self._select(
            "premium_entitlements",
            {
                "select": "id",
                "user_id": f"eq.{user_id}",
                "status": "eq.active",
                "or": f"(expires_at.is.null,expires_at.gt.{now})",
                "limit": 1,
            },
        )
        return bool(rows)

    async def list_entitlements(
        self,
        user_id: str | None = None,
        status: str | None = None,
        product: str | None = None,
        platform: str | None = None,
    ) -> list[dict]:
        params: dict = {"select": "*", "order": "created_at.desc"}
        if user_id is not None:
            params["user_id"] = f"eq.{user_id}"
        if status is not None:
            params["status"] = f"eq.{status}"
        if product is not None:
            params["product"] = f"eq.{product}"
        if platform is not None:
            params["platform"] = f"eq.{platform}"
        return await self._select("premium_entitlements", params)

    async def get_entitlement_by_receipt_ref(self, receipt_ref: str) -> dict | None:
        rows = await self._select(
            "premium_entitlements",
            {"select": "*", "receipt_ref": f"eq.{receipt_ref}", "limit": 1},
        )
        return rows[0] if rows else None

    async def grant_entitlement(self, **fields: Any) -> int:
        response = await self._request(
            "POST",
            "premium_entitlements",
            json_body=fields,
            headers={"Prefer": "return=representation"},
        )
        return response.json()[0]["id"]

    async def update_entitlement(self, entitlement_id: int, **fields: Any) -> None:
        await self._request(
            "PATCH",
            "premium_entitlements",
            params={"id": f"eq.{entitlement_id}"},
            json_body=fields,
        )

    async def revoke_entitlement(self, entitlement_id: int) -> None:
        await self._request(
            "PATCH",
            "premium_entitlements",
            params={"id": f"eq.{entitlement_id}"},
            json_body={"status": "revoked"},
        )

    # ----------------------------------------------- grilles / favoris / prefs
    async def list_saved_grids(self, user_id: str) -> list[dict]:
        return await self._select(
            "saved_grids",
            {"select": "*", "user_id": f"eq.{user_id}", "order": "created_at.desc"},
        )

    async def count_saved_grids(self, user_id: str) -> int:
        return await self._count("saved_grids", {"user_id": f"eq.{user_id}"})

    async def create_saved_grid(self, user_id: str, data: dict) -> dict:
        response = await self._request(
            "POST",
            "saved_grids",
            json_body={"user_id": user_id, **data},
            headers={"Prefer": "return=representation"},
        )
        return response.json()[0]

    async def delete_saved_grid(self, user_id: str, grid_id: int) -> None:
        response = await self._request(
            "DELETE",
            "saved_grids",
            params={"id": f"eq.{grid_id}", "user_id": f"eq.{user_id}"},
            headers={"Prefer": "return=representation"},
        )
        if not response.json():
            raise NotFoundError("Grille introuvable.")

    async def list_favorites(self, user_id: str) -> list[dict]:
        return await self._select("favorites", {"select": "*", "user_id": f"eq.{user_id}"})

    async def add_favorite(self, user_id: str, number: int, is_chance: bool) -> dict:
        response = await self._request(
            "POST",
            "favorites",
            json_body={"user_id": user_id, "number": number, "is_chance": is_chance},
            headers={"Prefer": "return=representation"},
        )
        return response.json()[0]

    async def remove_favorite(self, user_id: str, number: int, is_chance: bool) -> None:
        await self._request(
            "DELETE",
            "favorites",
            params={
                "user_id": f"eq.{user_id}",
                "number": f"eq.{number}",
                "is_chance": f"eq.{str(is_chance).lower()}",
            },
        )

    async def get_preferences(self, user_id: str) -> dict | None:
        rows = await self._select(
            "user_preferences", {"select": "*", "user_id": f"eq.{user_id}", "limit": 1}
        )
        return rows[0] if rows else None

    async def upsert_preferences(self, user_id: str, data: dict) -> dict:
        response = await self._request(
            "POST",
            "user_preferences",
            json_body={"user_id": user_id, **data},
            headers={"Prefer": "resolution=merge-duplicates,return=representation"},
            params={"on_conflict": "user_id"},
        )
        return response.json()[0]

    async def list_notifications(self, user_id: str, limit: int = 50) -> list[dict]:
        return await self._select(
            "notifications",
            {
                "select": "*",
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc",
                "limit": limit,
            },
        )

    async def create_notification(self, user_id: str, kind: str, title: str, body: str) -> None:
        await self._request(
            "POST",
            "notifications",
            json_body={"user_id": user_id, "kind": kind, "title": title, "body": body},
        )

    async def mark_notification_read(self, user_id: str, notification_id: int) -> None:
        response = await self._request(
            "PATCH",
            "notifications",
            params={"id": f"eq.{notification_id}", "user_id": f"eq.{user_id}"},
            json_body={"read_at": datetime.now(UTC).isoformat()},
            headers={"Prefer": "return=representation"},
        )
        if not response.json():
            raise NotFoundError("Notification introuvable.")

    # ----------------------------------------------- audit / contenus / pubs
    async def add_audit(self, **fields: Any) -> None:
        await self._request("POST", "audit_log", json_body=fields)

    async def list_audit(self, limit: int = 100) -> list[dict]:
        return await self._select(
            "audit_log", {"select": "*", "order": "created_at.desc", "limit": limit}
        )

    async def list_seo_contents(self, published_only: bool = False) -> list[dict]:
        params: dict = {"select": "*", "order": "slug.asc"}
        if published_only:
            params["published"] = "eq.true"
        return await self._select("seo_contents", params)

    async def upsert_seo_content(self, data: dict) -> dict:
        response = await self._request(
            "POST",
            "seo_contents",
            json_body=data,
            headers={"Prefer": "resolution=merge-duplicates,return=representation"},
            params={"on_conflict": "slug"},
        )
        return response.json()[0]

    async def delete_seo_content(self, slug: str) -> None:
        response = await self._request(
            "DELETE",
            "seo_contents",
            params={"slug": f"eq.{slug}"},
            headers={"Prefer": "return=representation"},
        )
        if not response.json():
            raise NotFoundError("Contenu introuvable.")

    async def list_ad_placements(self, enabled_only: bool = False) -> list[dict]:
        params: dict = {"select": "*", "order": "code.asc"}
        if enabled_only:
            params["enabled"] = "eq.true"
        return await self._select("ad_placements", params)

    async def upsert_ad_placement(self, data: dict) -> dict:
        response = await self._request(
            "POST",
            "ad_placements",
            json_body=data,
            headers={"Prefer": "resolution=merge-duplicates,return=representation"},
            params={"on_conflict": "code"},
        )
        return response.json()[0]

    # -------------------------------------------------------------------- RGPD
    async def export_user_data(self, user_id: str) -> dict:
        return {
            "profile": await self.get_profile(user_id),
            "preferences": await self.get_preferences(user_id),
            "saved_grids": await self.list_saved_grids(user_id),
            "favorites": await self.list_favorites(user_id),
            "notifications": await self.list_notifications(user_id, limit=1000),
            "premium_entitlements": await self.list_entitlements(user_id),
        }

    async def delete_user_data(self, user_id: str) -> None:
        # La suppression du compte auth supprime en cascade toutes les données
        # liées (contraintes ON DELETE CASCADE définies dans les migrations).
        response = await self._client.delete(f"{self._auth_admin}/users/{user_id}")
        if response.status_code == 404:
            raise NotFoundError("Utilisateur introuvable.")
        if response.status_code >= 400:
            raise UpstreamError(f"Suppression du compte impossible (HTTP {response.status_code}).")

    # ------------------------------------------------------------------- santé
    async def ping(self) -> bool:
        try:
            await self._request("GET", "draws", params={"select": "id", "limit": 1})
            return True
        except Exception:
            return False
