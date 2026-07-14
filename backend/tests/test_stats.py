"""Tests du moteur statistique (fixtures fictives, résultats vérifiés à la main)."""

from datetime import date

import pytest

from app.schemas.draws import Draw
from app.stats import engine, montecarlo
from app.stats.disclaimers import STATS_DISCLAIMER


def make_draw(id_: int, d: date, numbers: list[int], chance: int) -> Draw:
    return Draw(id=id_, draw_date=d, numbers=numbers, chance=chance)


DRAWS = [
    make_draw(1, date(2020, 1, 4), [1, 2, 3, 4, 5], 1),
    make_draw(2, date(2020, 1, 6), [1, 6, 7, 8, 9], 2),
    make_draw(3, date(2020, 1, 8), [1, 2, 10, 20, 30], 1),
    make_draw(4, date(2020, 1, 11), [40, 41, 45, 47, 49], 5),
]


def test_frequencies_absolute_and_relative():
    result = engine.frequencies(DRAWS)
    one = next(item for item in result["numbers"] if item["number"] == 1)
    assert one["count"] == 3
    assert one["relative"] == 0.75
    chance_one = next(item for item in result["chance"] if item["number"] == 1)
    assert chance_one["count"] == 2
    assert result["disclaimer"] == STATS_DISCLAIMER


def test_delays():
    result = engine.delays(DRAWS)
    delays = {item["number"]: item["delay"] for item in result["numbers"]}
    assert delays[40] == 0        # dernier tirage
    assert delays[1] == 1         # avant-dernier
    assert delays[5] == 3
    assert delays[13] is None     # jamais sorti


def test_gaps():
    result = engine.gaps(DRAWS)
    one = next(item for item in result["numbers"] if item["number"] == 1)
    assert one["appearances"] == 3
    assert one["gap_min"] == 1 and one["gap_max"] == 1 and one["gap_mean"] == 1.0
    never = next(item for item in result["numbers"] if item["number"] == 13)
    assert never["gap_mean"] is None


def test_pairs_and_triplets():
    pairs = engine.combinations_stats(DRAWS, size=2, limit=5)
    top = pairs["combinations"][0]
    assert top["numbers"] == [1, 2]
    assert top["count"] == 2
    triplets = engine.combinations_stats(DRAWS, size=3, limit=5)
    assert triplets["combinations"][0]["count"] == 1
    with pytest.raises(ValueError):
        engine.combinations_stats(DRAWS, size=4)


def test_draw_shapes():
    result = engine.draw_shapes(DRAWS)
    # tirage 1 : 1-2-3-4-5 → 4 paires consécutives
    consecutive = {item["consecutive_pairs"]: item["draws"] for item in result["consecutive"]}
    assert consecutive[4] == 1
    assert result["sum"]["min"] == 15  # 1+2+3+4+5
    assert result["sum"]["max"] == 222  # 40+41+45+47+49
    assert result["amplitude"]["min"] == 4
    even = {item["even_count"]: item["draws"] for item in result["even_odd"]}
    assert even[2] >= 1


def test_by_period_and_compare():
    periods = engine.by_period(DRAWS, "month")
    assert periods["periods"][0]["period"] == "2020-01"
    assert periods["periods"][0]["draw_count"] == 4
    compare = engine.compare_windows(DRAWS, 2, 4)
    one = next(item for item in compare["numbers"] if item["number"] == 1)
    assert one["relative_a"] == 0.5   # présent dans 1 des 2 derniers
    assert one["relative_b"] == 0.75


def test_number_profile():
    profile = engine.number_profile(DRAWS, 1)
    assert profile["appearances"] == 3
    assert profile["current_delay"] == 1
    assert profile["top_companions"][0]["number"] == 2
    chance_profile = engine.number_profile(DRAWS, 1, is_chance=True)
    assert chance_profile["appearances"] == 2
    with pytest.raises(ValueError):
        engine.number_profile(DRAWS, 50)


def test_apply_window():
    assert len(engine.apply_window(DRAWS, 2)) == 2
    assert engine.apply_window(DRAWS, None) == DRAWS
    assert engine.apply_window(DRAWS, 100) == DRAWS


def test_overview_handles_empty_history():
    result = engine.overview([])
    assert result["draw_count"] == 0
    assert result["most_frequent"][0]["count"] == 0


def test_monte_carlo_reproducible_with_seed():
    a = montecarlo.simulate_random_play(iterations=1000, seed=42)
    b = montecarlo.simulate_random_play(iterations=1000, seed=42)
    assert a["distribution"] == b["distribution"]
    total = sum(item["count"] for item in a["distribution"])
    assert total == 1000
    assert a["disclaimer"] == STATS_DISCLAIMER


def test_simulate_grid_against_history():
    result = montecarlo.simulate_grid_against_history(DRAWS, [1, 2, 3, 4, 5], 1)
    dist = {item["matching_numbers"]: item["draws"] for item in result["match_distribution"]}
    assert dist[5] == 1   # correspond exactement au premier tirage fictif
    assert result["chance_matches"] == 2
