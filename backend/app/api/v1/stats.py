"""Endpoints d'analyse statistique.

Le paramètre `window` restreint l'analyse aux N derniers tirages
(10, 20, 50, 100) ; absent = historique complet.
Les résultats sont mis en cache (TTL) car ils ne changent qu'aux imports.
"""

from fastapi import APIRouter, Depends, Query, Request, Response

from ...core.cache import TTLCache
from ...core.security import AuthUser, get_optional_user, require_user
from ...schemas.draws import Draw
from ...services.exports import analysis_to_pdf
from ...services.premium import PremiumPolicy
from ...stats import engine, montecarlo
from ..deps import get_all_draws_cached, get_cache, get_policy

router = APIRouter(prefix="/stats", tags=["Statistiques"])

WindowParam = Query(None, description="Analyse limitée aux N derniers tirages (10, 20, 50, 100…)", ge=1, le=100_000)


def _cached(cache: TTLCache, key: str, compute):
    result = cache.get(key)
    if result is None:
        result = compute()
        cache.set(key, result)
    return result


@router.get("/overview")
async def overview(
    window: int | None = WindowParam,
    draws: list[Draw] = Depends(get_all_draws_cached),
    cache: TTLCache = Depends(get_cache),
) -> dict:
    return _cached(cache, f"overview:{window}", lambda: engine.overview(engine.apply_window(draws, window)))


@router.get("/frequencies")
async def frequencies(
    window: int | None = WindowParam,
    draws: list[Draw] = Depends(get_all_draws_cached),
    cache: TTLCache = Depends(get_cache),
) -> dict:
    return _cached(cache, f"freq:{window}", lambda: engine.frequencies(engine.apply_window(draws, window)))


@router.get("/delays")
async def delays(
    window: int | None = WindowParam,
    draws: list[Draw] = Depends(get_all_draws_cached),
    cache: TTLCache = Depends(get_cache),
) -> dict:
    return _cached(cache, f"delays:{window}", lambda: engine.delays(engine.apply_window(draws, window)))


@router.get("/gaps")
async def gaps(
    window: int | None = WindowParam,
    draws: list[Draw] = Depends(get_all_draws_cached),
    cache: TTLCache = Depends(get_cache),
) -> dict:
    return _cached(cache, f"gaps:{window}", lambda: engine.gaps(engine.apply_window(draws, window)))


@router.get("/pairs")
async def pairs(
    window: int | None = WindowParam,
    limit: int = Query(20, ge=1, le=100),
    draws: list[Draw] = Depends(get_all_draws_cached),
    cache: TTLCache = Depends(get_cache),
) -> dict:
    return _cached(
        cache,
        f"pairs:{window}:{limit}",
        lambda: engine.combinations_stats(engine.apply_window(draws, window), size=2, limit=limit),
    )


@router.get("/triplets")
async def triplets(
    window: int | None = WindowParam,
    limit: int = Query(20, ge=1, le=100),
    user: AuthUser | None = Depends(get_optional_user),
    policy: PremiumPolicy = Depends(get_policy),
    draws: list[Draw] = Depends(get_all_draws_cached),
    cache: TTLCache = Depends(get_cache),
) -> dict:
    policy.check_advanced_stats(user)
    return _cached(
        cache,
        f"triplets:{window}:{limit}",
        lambda: engine.combinations_stats(engine.apply_window(draws, window), size=3, limit=limit),
    )


@router.get("/shapes")
async def shapes(
    window: int | None = WindowParam,
    draws: list[Draw] = Depends(get_all_draws_cached),
    cache: TTLCache = Depends(get_cache),
) -> dict:
    return _cached(cache, f"shapes:{window}", lambda: engine.draw_shapes(engine.apply_window(draws, window)))


@router.get("/periods")
async def periods(
    granularity: str = Query("year", pattern="^(year|month)$"),
    draws: list[Draw] = Depends(get_all_draws_cached),
    cache: TTLCache = Depends(get_cache),
) -> dict:
    return _cached(cache, f"periods:{granularity}", lambda: engine.by_period(draws, granularity))


@router.get("/compare")
async def compare(
    window_a: int = Query(20, ge=5, le=100_000),
    window_b: int = Query(100, ge=5, le=100_000),
    user: AuthUser | None = Depends(get_optional_user),
    policy: PremiumPolicy = Depends(get_policy),
    draws: list[Draw] = Depends(get_all_draws_cached),
    cache: TTLCache = Depends(get_cache),
) -> dict:
    policy.check_advanced_stats(user)
    return _cached(
        cache,
        f"compare:{window_a}:{window_b}",
        lambda: engine.compare_windows(draws, window_a, window_b),
    )


@router.get("/numbers/{number}")
async def number_profile(
    number: int,
    is_chance: bool = Query(False),
    window: int | None = WindowParam,
    draws: list[Draw] = Depends(get_all_draws_cached),
    cache: TTLCache = Depends(get_cache),
) -> dict:
    return _cached(
        cache,
        f"number:{number}:{is_chance}:{window}",
        lambda: engine.number_profile(engine.apply_window(draws, window), number, is_chance),
    )


@router.get("/monte-carlo")
async def monte_carlo(
    request: Request,
    iterations: int = Query(10_000, ge=100),
    seed: int | None = Query(None),
    user: AuthUser | None = Depends(get_optional_user),
    policy: PremiumPolicy = Depends(get_policy),
) -> dict:
    capped = min(iterations, policy.max_monte_carlo_iterations(user))
    return montecarlo.simulate_random_play(iterations=capped, seed=seed)


@router.get("/simulate-grid")
async def simulate_grid(
    numbers: str = Query(..., description="Cinq numéros séparés par des virgules, ex. 3,12,24,37,48"),
    chance: int = Query(..., ge=1, le=10),
    draws: list[Draw] = Depends(get_all_draws_cached),
) -> dict:
    from ...schemas.draws import validate_main_numbers

    parsed = validate_main_numbers([int(part) for part in numbers.split(",")])
    return montecarlo.simulate_grid_against_history(draws, parsed, chance)


@router.get("/report.pdf")
async def stats_report_pdf(
    window: int | None = WindowParam,
    user: AuthUser = Depends(require_user),
    policy: PremiumPolicy = Depends(get_policy),
    draws: list[Draw] = Depends(get_all_draws_cached),
) -> Response:
    policy.check_pdf_export(user)
    windowed = engine.apply_window(draws, window)
    freq = engine.frequencies(windowed)
    delay = engine.delays(windowed)
    top_freq = sorted(freq["numbers"], key=lambda item: -item["count"])[:15]
    top_delay = sorted(
        (d for d in delay["numbers"] if d["delay"] is not None), key=lambda item: -item["delay"]
    )[:15]
    pdf = analysis_to_pdf(
        "Rapport statistique",
        [
            (
                "Numéros les plus fréquents",
                [["Numéro", "Sorties", "Fréquence relative"]]
                + [[str(i["number"]), str(i["count"]), f"{i['relative']:.2%}"] for i in top_freq],
            ),
            (
                "Retards les plus longs",
                [["Numéro", "Retard (tirages)"]]
                + [[str(i["number"]), str(i["delay"])] for i in top_delay],
            ),
        ],
    )
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=lotolab-rapport.pdf"},
    )
