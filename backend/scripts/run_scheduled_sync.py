"""Exécute une synchronisation des tirages sans API hébergée.

Pensé pour tourner directement dans un runner GitHub Actions (ou tout autre
environnement ponctuel) : CollectorService ne dépend que de Supabase (clé
service role) et des réglages, jamais du serveur FastAPI — inutile de
déployer et faire tourner l'API en continu juste pour cette synchronisation.

Variables d'environnement requises : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
COLLECTOR_HISTORY_URLS (voir backend/.env.example). Sort avec un code non nul
si la synchronisation échoue, pour que le workflow CI le détecte.
"""

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.collector.service import CollectorService  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.db.supabase_repo import SupabaseRepository  # noqa: E402


async def main() -> int:
    settings = get_settings()
    if not settings.supabase_configured:
        print(
            "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non configurés — "
            "impossible de synchroniser sans base de données.",
            file=sys.stderr,
        )
        return 1

    repository = SupabaseRepository(settings.supabase_url, settings.supabase_service_role_key)
    collector = CollectorService(repository, settings)
    try:
        result = await collector.run_scheduled_sync(triggered_by="github_actions_script")
    finally:
        await repository.aclose()

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"] != "failed" else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
