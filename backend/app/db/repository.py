"""Couche d'accès aux données.

Deux implémentations du même protocole :
  * `MemoryRepository` — stockage en mémoire pour les tests et le développement
    sans identifiants Supabase ; la base démarre vide (aucune donnée fictive) ;
  * `SupabaseRepository` (voir supabase_repo.py) — production, via PostgREST
    avec la clé service role (requêtes paramétrées, RLS contournée côté serveur
    uniquement).
"""

from datetime import UTC, date, datetime
from itertools import count
from typing import Any, Protocol

from ..core.errors import ConflictError, NotFoundError
from ..schemas.draws import Draw, DrawCreate


class Repository(Protocol):
    # --- Tirages ---
    async def list_draws(
        self, page: int, page_size: int, year: int | None = None, month: int | None = None
    ) -> tuple[list[Draw], int]: ...
    async def all_draws(self) -> list[Draw]: ...
    async def get_draw_by_date(self, draw_date: date) -> Draw | None: ...
    async def get_draw(self, draw_id: int) -> Draw | None: ...
    async def latest_draw(self) -> Draw | None: ...
    async def insert_draws(self, draws: list[DrawCreate]) -> tuple[int, int]: ...
    async def update_draw(self, draw_id: int, data: dict) -> Draw: ...
    async def delete_draw(self, draw_id: int) -> None: ...

    # --- Pipeline d'import ---
    async def create_import_job(self, **fields: Any) -> int: ...
    async def update_import_job(self, job_id: int, **fields: Any) -> None: ...
    async def list_import_jobs(self, limit: int = 50) -> list[dict]: ...
    async def add_quarantine(self, job_id: int | None, raw_data: dict, reason: str) -> int: ...
    async def list_quarantine(self, status: str = "pending") -> list[dict]: ...
    async def get_quarantine(self, item_id: int) -> dict | None: ...
    async def review_quarantine(self, item_id: int, status: str, reviewer_id: str) -> None: ...
    async def add_sync_log(
        self, job_id: int | None, level: str, message: str, context: dict | None = None
    ) -> None: ...
    async def list_sync_logs(self, job_id: int | None = None, limit: int = 200) -> list[dict]: ...

    # --- Utilisateurs / Premium ---
    async def get_profile(self, user_id: str) -> dict | None: ...
    async def list_profiles(self, page: int, page_size: int) -> tuple[list[dict], int]: ...
    async def set_profile_role(self, user_id: str, role: str) -> None: ...
    async def has_active_premium(self, user_id: str) -> bool: ...
    async def list_entitlements(self, user_id: str | None = None) -> list[dict]: ...
    async def get_entitlement_by_receipt_ref(self, receipt_ref: str) -> dict | None: ...
    async def grant_entitlement(self, **fields: Any) -> int: ...
    async def update_entitlement(self, entitlement_id: int, **fields: Any) -> None: ...
    async def revoke_entitlement(self, entitlement_id: int) -> None: ...

    # --- Grilles / favoris / préférences / notifications ---
    async def list_saved_grids(self, user_id: str) -> list[dict]: ...
    async def count_saved_grids(self, user_id: str) -> int: ...
    async def create_saved_grid(self, user_id: str, data: dict) -> dict: ...
    async def delete_saved_grid(self, user_id: str, grid_id: int) -> None: ...
    async def list_favorites(self, user_id: str) -> list[dict]: ...
    async def add_favorite(self, user_id: str, number: int, is_chance: bool) -> dict: ...
    async def remove_favorite(self, user_id: str, number: int, is_chance: bool) -> None: ...
    async def get_preferences(self, user_id: str) -> dict | None: ...
    async def upsert_preferences(self, user_id: str, data: dict) -> dict: ...
    async def list_notifications(self, user_id: str, limit: int = 50) -> list[dict]: ...
    async def create_notification(self, user_id: str, kind: str, title: str, body: str) -> None: ...
    async def mark_notification_read(self, user_id: str, notification_id: int) -> None: ...

    # --- Audit / contenus / publicité ---
    async def add_audit(self, **fields: Any) -> None: ...
    async def list_audit(self, limit: int = 100) -> list[dict]: ...
    async def list_seo_contents(self, published_only: bool = False) -> list[dict]: ...
    async def upsert_seo_content(self, data: dict) -> dict: ...
    async def delete_seo_content(self, slug: str) -> None: ...
    async def list_ad_placements(self, enabled_only: bool = False) -> list[dict]: ...
    async def upsert_ad_placement(self, data: dict) -> dict: ...

    # --- RGPD ---
    async def export_user_data(self, user_id: str) -> dict: ...
    async def delete_user_data(self, user_id: str) -> None: ...

    # --- Santé ---
    async def ping(self) -> bool: ...


def _utcnow() -> str:
    return datetime.now(UTC).isoformat()


class MemoryRepository:
    """Implémentation en mémoire — tests et développement local uniquement."""

    def __init__(self) -> None:
        self._draws: dict[int, Draw] = {}
        self._jobs: dict[int, dict] = {}
        self._quarantine: dict[int, dict] = {}
        self._logs: list[dict] = []
        self._profiles: dict[str, dict] = {}
        self._entitlements: dict[int, dict] = {}
        self._grids: dict[int, dict] = {}
        self._favorites: list[dict] = []
        self._preferences: dict[str, dict] = {}
        self._notifications: dict[int, dict] = {}
        self._audit: list[dict] = []
        self._seo: dict[str, dict] = {}
        self._ads: dict[str, dict] = {}
        self._ids = count(1)

    # --- Tirages ---
    async def list_draws(
        self, page: int, page_size: int, year: int | None = None, month: int | None = None
    ) -> tuple[list[Draw], int]:
        items = sorted(self._draws.values(), key=lambda d: d.draw_date, reverse=True)
        if year is not None:
            items = [d for d in items if d.draw_date.year == year]
        if month is not None:
            items = [d for d in items if d.draw_date.month == month]
        total = len(items)
        start = (page - 1) * page_size
        return items[start : start + page_size], total

    async def all_draws(self) -> list[Draw]:
        return sorted(self._draws.values(), key=lambda d: d.draw_date)

    async def get_draw_by_date(self, draw_date: date) -> Draw | None:
        return next((d for d in self._draws.values() if d.draw_date == draw_date), None)

    async def get_draw(self, draw_id: int) -> Draw | None:
        return self._draws.get(draw_id)

    async def latest_draw(self) -> Draw | None:
        draws = await self.all_draws()
        return draws[-1] if draws else None

    async def insert_draws(self, draws: list[DrawCreate]) -> tuple[int, int]:
        inserted = skipped = 0
        existing_dates = {d.draw_date for d in self._draws.values()}
        for item in draws:
            if item.draw_date in existing_dates:
                skipped += 1
                continue
            new_id = next(self._ids)
            self._draws[new_id] = Draw(
                id=new_id,
                draw_date=item.draw_date,
                numbers=item.numbers,
                chance=item.chance,
                source=item.source,
                source_url=item.source_url,
                retrieved_at=datetime.now(UTC),
            )
            existing_dates.add(item.draw_date)
            inserted += 1
        return inserted, skipped

    async def update_draw(self, draw_id: int, data: dict) -> Draw:
        current = self._draws.get(draw_id)
        if current is None:
            raise NotFoundError("Tirage introuvable.")
        updated = current.model_copy(update=data)
        self._draws[draw_id] = updated
        return updated

    async def delete_draw(self, draw_id: int) -> None:
        if draw_id not in self._draws:
            raise NotFoundError("Tirage introuvable.")
        del self._draws[draw_id]

    # --- Pipeline d'import ---
    async def create_import_job(self, **fields: Any) -> int:
        job_id = next(self._ids)
        self._jobs[job_id] = {"id": job_id, "created_at": _utcnow(), "status": "pending", **fields}
        return job_id

    async def update_import_job(self, job_id: int, **fields: Any) -> None:
        if job_id in self._jobs:
            self._jobs[job_id].update(fields)

    async def list_import_jobs(self, limit: int = 50) -> list[dict]:
        jobs = sorted(self._jobs.values(), key=lambda j: j["id"], reverse=True)
        return jobs[:limit]

    async def add_quarantine(self, job_id: int | None, raw_data: dict, reason: str) -> int:
        item_id = next(self._ids)
        self._quarantine[item_id] = {
            "id": item_id,
            "job_id": job_id,
            "raw_data": raw_data,
            "reason": reason,
            "status": "pending",
            "created_at": _utcnow(),
        }
        return item_id

    async def list_quarantine(self, status: str = "pending") -> list[dict]:
        return [q for q in self._quarantine.values() if q["status"] == status]

    async def get_quarantine(self, item_id: int) -> dict | None:
        return self._quarantine.get(item_id)

    async def review_quarantine(self, item_id: int, status: str, reviewer_id: str) -> None:
        item = self._quarantine.get(item_id)
        if item is None:
            raise NotFoundError("Élément de quarantaine introuvable.")
        item.update({"status": status, "reviewed_by": reviewer_id, "reviewed_at": _utcnow()})

    async def add_sync_log(
        self, job_id: int | None, level: str, message: str, context: dict | None = None
    ) -> None:
        self._logs.append(
            {
                "id": next(self._ids),
                "job_id": job_id,
                "level": level,
                "message": message,
                "context": context,
                "created_at": _utcnow(),
            }
        )

    async def list_sync_logs(self, job_id: int | None = None, limit: int = 200) -> list[dict]:
        logs = [log for log in self._logs if job_id is None or log["job_id"] == job_id]
        return logs[-limit:]

    # --- Utilisateurs / Premium ---
    async def get_profile(self, user_id: str) -> dict | None:
        return self._profiles.get(user_id)

    async def list_profiles(self, page: int, page_size: int) -> tuple[list[dict], int]:
        profiles = list(self._profiles.values())
        start = (page - 1) * page_size
        return profiles[start : start + page_size], len(profiles)

    async def set_profile_role(self, user_id: str, role: str) -> None:
        self._profiles.setdefault(user_id, {"id": user_id})["role"] = role

    async def has_active_premium(self, user_id: str) -> bool:
        now = datetime.now(UTC)
        for ent in self._entitlements.values():
            if ent["user_id"] != user_id or ent["status"] != "active":
                continue
            expires = ent.get("expires_at")
            if expires is None or datetime.fromisoformat(expires) > now:
                return True
        return False

    async def list_entitlements(self, user_id: str | None = None) -> list[dict]:
        return [
            e for e in self._entitlements.values() if user_id is None or e["user_id"] == user_id
        ]

    async def get_entitlement_by_receipt_ref(self, receipt_ref: str) -> dict | None:
        for ent in self._entitlements.values():
            if ent.get("receipt_ref") == receipt_ref:
                return ent
        return None

    async def grant_entitlement(self, **fields: Any) -> int:
        ent_id = next(self._ids)
        self._entitlements[ent_id] = {
            "id": ent_id,
            "status": "active",
            "created_at": _utcnow(),
            **fields,
        }
        return ent_id

    async def update_entitlement(self, entitlement_id: int, **fields: Any) -> None:
        ent = self._entitlements.get(entitlement_id)
        if ent is None:
            raise NotFoundError("Droit Premium introuvable.")
        ent.update(fields)

    async def revoke_entitlement(self, entitlement_id: int) -> None:
        ent = self._entitlements.get(entitlement_id)
        if ent is None:
            raise NotFoundError("Droit Premium introuvable.")
        ent["status"] = "revoked"

    # --- Grilles / favoris / préférences / notifications ---
    async def list_saved_grids(self, user_id: str) -> list[dict]:
        return [g for g in self._grids.values() if g["user_id"] == user_id]

    async def count_saved_grids(self, user_id: str) -> int:
        return len(await self.list_saved_grids(user_id))

    async def create_saved_grid(self, user_id: str, data: dict) -> dict:
        grid_id = next(self._ids)
        grid = {"id": grid_id, "user_id": user_id, "created_at": _utcnow(), **data}
        self._grids[grid_id] = grid
        return grid

    async def delete_saved_grid(self, user_id: str, grid_id: int) -> None:
        grid = self._grids.get(grid_id)
        if grid is None or grid["user_id"] != user_id:
            raise NotFoundError("Grille introuvable.")
        del self._grids[grid_id]

    async def list_favorites(self, user_id: str) -> list[dict]:
        return [f for f in self._favorites if f["user_id"] == user_id]

    async def add_favorite(self, user_id: str, number: int, is_chance: bool) -> dict:
        for fav in self._favorites:
            if fav["user_id"] == user_id and fav["number"] == number and fav["is_chance"] == is_chance:
                raise ConflictError("Ce favori existe déjà.")
        fav = {
            "id": next(self._ids),
            "user_id": user_id,
            "number": number,
            "is_chance": is_chance,
        }
        self._favorites.append(fav)
        return fav

    async def remove_favorite(self, user_id: str, number: int, is_chance: bool) -> None:
        self._favorites = [
            f
            for f in self._favorites
            if not (f["user_id"] == user_id and f["number"] == number and f["is_chance"] == is_chance)
        ]

    async def get_preferences(self, user_id: str) -> dict | None:
        return self._preferences.get(user_id)

    async def upsert_preferences(self, user_id: str, data: dict) -> dict:
        prefs = self._preferences.setdefault(user_id, {"user_id": user_id})
        prefs.update(data)
        return prefs

    async def list_notifications(self, user_id: str, limit: int = 50) -> list[dict]:
        items = [n for n in self._notifications.values() if n["user_id"] == user_id]
        return sorted(items, key=lambda n: n["id"], reverse=True)[:limit]

    async def create_notification(self, user_id: str, kind: str, title: str, body: str) -> None:
        notif_id = next(self._ids)
        self._notifications[notif_id] = {
            "id": notif_id,
            "user_id": user_id,
            "kind": kind,
            "title": title,
            "body": body,
            "read_at": None,
            "created_at": _utcnow(),
        }

    async def mark_notification_read(self, user_id: str, notification_id: int) -> None:
        notif = self._notifications.get(notification_id)
        if notif is None or notif["user_id"] != user_id:
            raise NotFoundError("Notification introuvable.")
        notif["read_at"] = _utcnow()

    # --- Audit / contenus / publicité ---
    async def add_audit(self, **fields: Any) -> None:
        self._audit.append({"id": next(self._ids), "created_at": _utcnow(), **fields})

    async def list_audit(self, limit: int = 100) -> list[dict]:
        return self._audit[-limit:]

    async def list_seo_contents(self, published_only: bool = False) -> list[dict]:
        contents = list(self._seo.values())
        if published_only:
            contents = [c for c in contents if c.get("published")]
        return contents

    async def upsert_seo_content(self, data: dict) -> dict:
        slug = data["slug"]
        current = self._seo.setdefault(slug, {"id": next(self._ids), "slug": slug})
        current.update(data)
        current["updated_at"] = _utcnow()
        return current

    async def delete_seo_content(self, slug: str) -> None:
        if slug not in self._seo:
            raise NotFoundError("Contenu introuvable.")
        del self._seo[slug]

    async def list_ad_placements(self, enabled_only: bool = False) -> list[dict]:
        ads = list(self._ads.values())
        if enabled_only:
            ads = [a for a in ads if a.get("enabled")]
        return ads

    async def upsert_ad_placement(self, data: dict) -> dict:
        code = data["code"]
        current = self._ads.setdefault(code, {"id": next(self._ids), "code": code})
        current.update(data)
        return current

    # --- RGPD ---
    async def export_user_data(self, user_id: str) -> dict:
        return {
            "profile": self._profiles.get(user_id),
            "preferences": self._preferences.get(user_id),
            "saved_grids": await self.list_saved_grids(user_id),
            "favorites": await self.list_favorites(user_id),
            "notifications": await self.list_notifications(user_id, limit=1000),
            "premium_entitlements": await self.list_entitlements(user_id),
        }

    async def delete_user_data(self, user_id: str) -> None:
        self._profiles.pop(user_id, None)
        self._preferences.pop(user_id, None)
        self._grids = {k: v for k, v in self._grids.items() if v["user_id"] != user_id}
        self._favorites = [f for f in self._favorites if f["user_id"] != user_id]
        self._notifications = {
            k: v for k, v in self._notifications.items() if v["user_id"] != user_id
        }
        self._entitlements = {
            k: v for k, v in self._entitlements.items() if v["user_id"] != user_id
        }

    # --- Santé ---
    async def ping(self) -> bool:
        return True
