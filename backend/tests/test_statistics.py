from datetime import date
from app.models import Draw
from app.statistics import frequencies, delays, weighted_grid

DRAWS = [
    Draw(date=date(2026, 1, 1), numbers=[1, 2, 3, 4, 5], chance=1),
    Draw(date=date(2026, 1, 2), numbers=[1, 6, 7, 8, 9], chance=2),
]

def test_frequencies():
    result = frequencies(DRAWS)
    number_one = next(item for item in result["numbers"] if item["number"] == 1)
    assert number_one["count"] == 2

def test_delays():
    result = delays(DRAWS)
    number_one = next(item for item in result["numbers"] if item["number"] == 1)
    assert number_one["delay"] == 0

def test_weighted_grid_is_valid():
    grid = weighted_grid(DRAWS, seed=42)
    assert len(grid.numbers) == 5
    assert len(set(grid.numbers)) == 5
    assert all(1 <= n <= 49 for n in grid.numbers)
    assert 1 <= grid.chance <= 10
