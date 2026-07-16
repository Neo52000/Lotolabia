"""Tests de la production éditoriale automatique (fixtures fictives)."""

from datetime import date

import pytest

from app.content import topics as topics_module
from app.content.service import ContentGenerationService
from app.content.writer import (
    FORBIDDEN_PHRASES,
    NonCompliantArticleError,
    assert_compliant,
    write_article,
)
from app.core.config import Settings
from app.db.repository import MemoryRepository
from app.schemas.draws import Draw, DrawCreate


def make_draw(id_: int, d: date, numbers: list[int], chance: int) -> Draw:
    return Draw(id=id_, draw_date=d, numbers=numbers, chance=chance)


def month_of_draws(year: int, month: int, count: int = 8) -> list[Draw]:
    draws = []
    for index in range(count):
        day = 1 + index * 2
        if day > 28:
            break
        numbers = sorted({1 + (index * 7 + n) % 49 for n in range(5)})
        while len(numbers) < 5:
            numbers.append(max(numbers) + 1 if max(numbers) < 49 else 1)
        draws.append(make_draw(index + 1, date(year, month, day), sorted(numbers)[:5], 1 + index % 10))
    return draws


# ---------------------------------------------------------------------------
# Vocabulaire proscrit
# ---------------------------------------------------------------------------
def test_assert_compliant_raises_on_forbidden_phrase():
    for phrase in FORBIDDEN_PHRASES:
        with pytest.raises(NonCompliantArticleError):
            assert_compliant(f"Un texte qui parle de {phrase} par erreur.")


def test_assert_compliant_accepts_clean_text():
    assert_compliant("Un texte parfaitement conforme, sans vocabulaire proscrit.")


def test_all_evergreen_articles_are_compliant_and_disclaimed():
    for topic in topics_module.EVERGREEN_TOPICS:
        draft = write_article(topic, draws=[])
        assert draft is not None
        assert "aléatoires" in draft.body_md  # avertissement obligatoire présent
        assert_compliant(draft.title)
        assert_compliant(draft.body_md)
        assert draft.meta_description
        assert len(draft.meta_description) <= 400


# ---------------------------------------------------------------------------
# Sujets data-driven
# ---------------------------------------------------------------------------
def test_monthly_recap_returns_none_without_data():
    topic = topics_module.monthly_recap_topic(2019, 3)
    draft = write_article(topic, draws=[])
    assert draft is None


def test_monthly_recap_uses_real_period_data():
    draws = month_of_draws(2024, 5, count=6)
    topic = topics_module.monthly_recap_topic(2024, 5)
    draft = write_article(topic, draws)
    assert draft is not None
    assert "mai 2024" in draft.body_md.lower()
    assert_compliant(draft.body_md)


def test_rolling_top_uses_last_100_draws():
    draws = month_of_draws(2024, 1, count=8) + month_of_draws(2024, 2, count=8)
    topic = topics_module.rolling_top_topic()
    draft = write_article(topic, draws)
    assert draft is not None
    assert topic.refresh is True
    assert_compliant(draft.body_md)


# ---------------------------------------------------------------------------
# Backlog
# ---------------------------------------------------------------------------
def test_backlog_skips_existing_evergreen_slugs():
    existing = {topics_module.EVERGREEN_TOPICS[0].slug}
    backlog = topics_module.build_backlog(draws=[], existing_slugs=existing)
    slugs = [t.slug for t in backlog]
    assert topics_module.EVERGREEN_TOPICS[0].slug not in slugs
    assert topics_module.EVERGREEN_TOPICS[1].slug in slugs


def test_backlog_always_includes_rolling_top_refresh():
    all_slugs = {t.slug for t in topics_module.EVERGREEN_TOPICS}
    backlog = topics_module.build_backlog(draws=[], existing_slugs=all_slugs)
    rolling = [t for t in backlog if t.slug == topics_module.ROLLING_TOP_SLUG]
    assert len(rolling) == 1
    assert rolling[0].refresh is True


# ---------------------------------------------------------------------------
# Service (bout en bout, dépôt en mémoire)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_run_batch_respects_max_new_and_logs_audit():
    repo = MemoryRepository()
    for draw in month_of_draws(2024, 5, count=6):
        await repo.insert_draws(
            [
                DrawCreate(
                    draw_date=draw.draw_date,
                    numbers=draw.numbers,
                    chance=draw.chance,
                    source="test_fixture",
                )
            ]
        )
    settings = Settings(content_batch_size=2, content_auto_publish=True)
    service = ContentGenerationService(repo, settings)

    published = await service.run_batch(max_new=2)

    # 2 nouveaux articles évergreen + le palmarès glissant (refresh, hors quota)
    assert len(published) == 3
    contents = await repo.list_seo_contents()
    slugs = {c["slug"] for c in contents}
    assert topics_module.ROLLING_TOP_SLUG in slugs
    for content in contents:
        assert content["published"] is True

    audit = await repo.list_audit()
    assert any(entry["action"] == "content_auto_generate" for entry in audit)


@pytest.mark.asyncio
async def test_run_batch_does_not_regenerate_existing_evergreen():
    repo = MemoryRepository()
    settings = Settings(content_batch_size=10, content_auto_publish=True)
    service = ContentGenerationService(repo, settings)

    first = await service.run_batch(max_new=10)
    second = await service.run_batch(max_new=10)

    first_evergreen = [s for s in first if s != topics_module.ROLLING_TOP_SLUG]
    second_evergreen = [s for s in second if s != topics_module.ROLLING_TOP_SLUG]
    assert set(first_evergreen).isdisjoint(second_evergreen)


@pytest.mark.asyncio
async def test_backlog_preview_lists_upcoming_topics():
    repo = MemoryRepository()
    settings = Settings()
    service = ContentGenerationService(repo, settings)
    preview = await service.backlog_preview()
    assert len(preview) > 0
    assert all("slug" in item and "kind" in item for item in preview)
