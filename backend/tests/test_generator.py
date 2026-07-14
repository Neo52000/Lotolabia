"""Tests du générateur de grilles."""

from datetime import date

import pytest

from app.core.errors import AppError
from app.generator import grids as generator
from app.schemas.draws import Draw
from app.schemas.grids import GenerationRequest

DRAWS = [
    Draw(id=1, draw_date=date(2020, 1, 4), numbers=[1, 2, 3, 4, 5], chance=1),
    Draw(id=2, draw_date=date(2020, 1, 6), numbers=[1, 6, 7, 8, 9], chance=2),
]


def assert_valid(grid):
    assert len(grid.numbers) == 5
    assert len(set(grid.numbers)) == 5
    assert all(1 <= n <= 49 for n in grid.numbers)
    assert 1 <= grid.chance <= 10
    assert grid.warning  # avertissement obligatoire toujours présent


@pytest.mark.parametrize(
    "method", ["random", "frequency", "delay", "balanced", "sum_controlled", "diversified"]
)
def test_all_methods_produce_valid_grids(method):
    request = GenerationRequest(method=method, count=3, seed=7)
    result = generator.generate(request, DRAWS)
    assert len(result) == 3
    for grid in result:
        assert_valid(grid)


def test_seed_reproducibility():
    request = GenerationRequest(method="frequency", count=5, seed=1234)
    a = generator.generate(request, DRAWS)
    b = generator.generate(request, DRAWS)
    assert [g.numbers for g in a] == [g.numbers for g in b]
    assert [g.chance for g in a] == [g.chance for g in b]


def test_exclusions_respected():
    excluded = list(range(1, 21))
    request = GenerationRequest(method="random", seed=1, excluded_numbers=excluded)
    grid = generator.generate(request, DRAWS)[0]
    assert not set(grid.numbers) & set(excluded)


def test_favorites_included():
    request = GenerationRequest(method="random", seed=1, favorite_numbers=[7, 21, 42])
    grid = generator.generate(request, DRAWS)[0]
    assert {7, 21, 42}.issubset(set(grid.numbers))


def test_balanced_method_constraints():
    request = GenerationRequest(method="balanced", count=10, seed=99)
    for grid in generator.generate(request, DRAWS):
        even = sum(1 for n in grid.numbers if n % 2 == 0)
        low = sum(1 for n in grid.numbers if n <= 24)
        assert 2 <= even <= 3
        assert 2 <= low <= 3


def test_sum_control():
    request = GenerationRequest(method="sum_controlled", count=10, seed=5, sum_min=110, sum_max=140)
    for grid in generator.generate(request, DRAWS):
        assert 110 <= sum(grid.numbers) <= 140


def test_diversified_limits_overlap():
    request = GenerationRequest(method="diversified", count=5, seed=3)
    produced = [set(g.numbers) for g in generator.generate(request, DRAWS)]
    for i, a in enumerate(produced):
        for b in produced[i + 1 :]:
            assert len(a & b) <= 2


def test_maximum_exclusions_leave_deterministic_grid():
    # 44 exclusions laissent exactement 5 numéros : la grille est déterminée.
    request = GenerationRequest(method="random", seed=1, excluded_numbers=list(range(1, 45)))
    grid = generator.generate(request, DRAWS)[0]
    assert grid.numbers == [45, 46, 47, 48, 49]


def test_impossible_constraints_raise_clear_error():
    # somme minimale > somme maximale : contradiction directe
    with pytest.raises(AppError):
        generator.generate(
            GenerationRequest(method="sum_controlled", sum_min=200, sum_max=150), DRAWS
        )
    # somme de 15 impossible sans le numéro 1 (15 = 1+2+3+4+5 uniquement)
    with pytest.raises(AppError):
        generator.generate(
            GenerationRequest(
                method="sum_controlled", sum_min=15, sum_max=15, excluded_numbers=[1], seed=1
            ),
            DRAWS,
        )


def test_forbidden_vocabulary_absent():
    """Le vocabulaire interdit ne doit apparaître dans aucun libellé du générateur."""
    forbidden = ["gagnant", "sûr", "prédiction fiable", "garantie"]
    for label in generator.METHOD_LABELS.values():
        for word in forbidden:
            assert word not in label.lower()
