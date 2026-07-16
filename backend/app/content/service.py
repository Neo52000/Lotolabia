"""Orchestration de la production éditoriale automatique.

À chaque exécution (planifiée ou déclenchée manuellement depuis le
back-office), le service :
  1. relit les tirages réels et les contenus déjà publiés ;
  2. calcule le prochain lot de sujets à produire (`topics.build_backlog`) ;
  3. rédige chaque article à partir de données réelles uniquement
     (`writer.write_article`) ;
  4. publie (ou enregistre en brouillon) via le dépôt existant
     (`seo_contents`), et journalise l'opération dans `audit_log`.

Aucun appel réseau, aucune clé externe : la rédaction s'appuie uniquement sur
le moteur statistique interne. Un point d'extension (`ArticleEnhancer`) est
prévu pour brancher un modèle de langage optionnel plus tard (voir
`docs/SEO.md`), désactivé par défaut.
"""

from __future__ import annotations

import logging
from typing import Protocol

from ..core.config import Settings
from ..db.repository import Repository
from . import topics as topics_module
from .writer import ArticleDraft, write_article

logger = logging.getLogger(__name__)


class ArticleEnhancer(Protocol):
    """Point d'extension optionnel : reformulation par un modèle de langage.

    Désactivé par défaut (`CONTENT_AI_ENABLED=false`) — aucune clé API n'est
    requise pour que la production de contenu fonctionne : le texte
    template-based généré par `writer.py` est déjà publiable tel quel.
    """

    async def enhance(self, draft: ArticleDraft) -> ArticleDraft: ...


class ContentGenerationService:
    def __init__(
        self,
        repository: Repository,
        settings: Settings,
        enhancer: ArticleEnhancer | None = None,
    ) -> None:
        self._repository = repository
        self._settings = settings
        self._enhancer = enhancer

    async def run_batch(self, max_new: int = 2, actor_email: str = "scheduler") -> list[str]:
        """Produit jusqu'à `max_new` nouveaux articles + rafraîchit le contenu vivant.

        Retourne la liste des slugs publiés/rafraîchis lors de cette exécution.
        """
        draws = await self._repository.all_draws()
        existing = await self._repository.list_seo_contents()
        existing_slugs = {item["slug"] for item in existing}

        backlog = topics_module.build_backlog(draws, existing_slugs)
        published: list[str] = []
        new_count = 0

        for topic in backlog:
            if not topic.refresh and new_count >= max_new:
                continue
            draft = write_article(topic, draws)
            if draft is None:
                continue
            if self._enhancer is not None and self._settings.content_ai_enabled:
                try:
                    draft = await self._enhancer.enhance(draft)
                except Exception:  # noqa: BLE001 — l'enrichissement est optionnel, jamais bloquant
                    logger.exception("Échec de l'enrichissement IA pour %s — publication du texte de base.", draft.slug)

            await self._repository.upsert_seo_content(
                {
                    "slug": draft.slug,
                    "title": draft.title,
                    "meta_description": draft.meta_description,
                    "body_md": draft.body_md,
                    "published": self._settings.content_auto_publish,
                    "updated_by": None,
                }
            )
            await self._repository.add_audit(
                actor_id=None,
                actor_email=actor_email,
                action="content_auto_generate",
                target_type="seo_content",
                target_id=draft.slug,
                details={"kind": topic.kind, "refresh": topic.refresh},
            )
            published.append(draft.slug)
            if not topic.refresh:
                new_count += 1

        logger.info("Production éditoriale : %d article(s) publié(s)/rafraîchi(s).", len(published))
        return published

    async def backlog_preview(self) -> list[dict]:
        draws = await self._repository.all_draws()
        existing = await self._repository.list_seo_contents()
        existing_slugs = {item["slug"] for item in existing}
        backlog = topics_module.build_backlog(draws, existing_slugs)
        return [
            {"slug": t.slug, "kind": t.kind, "title": t.title, "refresh": t.refresh}
            for t in backlog
        ]
