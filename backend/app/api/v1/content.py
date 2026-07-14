"""Contenus éditoriaux publiés (blog / pages pédagogiques du site web)."""

from fastapi import APIRouter, Depends

from ...core.errors import NotFoundError
from ...db.repository import Repository
from ..deps import get_repository

router = APIRouter(prefix="/content", tags=["Contenus"])


@router.get("")
async def list_published(repository: Repository = Depends(get_repository)) -> list[dict]:
    contents = await repository.list_seo_contents(published_only=True)
    return [
        {k: v for k, v in content.items() if k in ("slug", "title", "meta_description", "updated_at")}
        for content in contents
    ]


@router.get("/{slug}")
async def get_published(slug: str, repository: Repository = Depends(get_repository)) -> dict:
    contents = await repository.list_seo_contents(published_only=True)
    for content in contents:
        if content["slug"] == slug:
            return content
    raise NotFoundError("Contenu introuvable.")
