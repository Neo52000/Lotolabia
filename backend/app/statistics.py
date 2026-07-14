from collections import Counter
from itertools import combinations
import random
from .models import Draw, WeightedGrid

WARNING = (
    "Analyse descriptive uniquement : chaque grille valide conserve la même "
    "probabilité théorique de gain au prochain tirage."
)

def frequencies(draws: list[Draw]) -> dict:
    main = Counter()
    chance = Counter()
    for draw in draws:
        main.update(draw.numbers)
        chance.update([draw.chance])
    return {
        "draw_count": len(draws),
        "numbers": [{"number": n, "count": main[n]} for n in range(1, 50)],
        "chance": [{"number": n, "count": chance[n]} for n in range(1, 11)],
    }

def delays(draws: list[Draw]) -> dict:
    latest_index = {n: None for n in range(1, 50)}
    latest_chance = {n: None for n in range(1, 11)}
    reversed_draws = list(reversed(draws))
    for index, draw in enumerate(reversed_draws):
        for number in draw.numbers:
            if latest_index[number] is None:
                latest_index[number] = index
        if latest_chance[draw.chance] is None:
            latest_chance[draw.chance] = index
    return {
        "numbers": [{"number": n, "delay": latest_index[n]} for n in range(1, 50)],
        "chance": [{"number": n, "delay": latest_chance[n]} for n in range(1, 11)],
    }

def cooccurrences(draws: list[Draw], limit: int = 20) -> list[dict]:
    pairs = Counter()
    for draw in draws:
        pairs.update(combinations(draw.numbers, 2))
    return [
        {"numbers": list(pair), "count": count}
        for pair, count in pairs.most_common(limit)
    ]

def weighted_grid(draws: list[Draw], seed: int | None = None) -> WeightedGrid:
    rng = random.Random(seed)
    counts = Counter()
    chance_counts = Counter()
    for draw in draws:
        counts.update(draw.numbers)
        chance_counts.update([draw.chance])

    number_population = list(range(1, 50))
    chance_population = list(range(1, 11))
    number_weights = [counts[n] + 1 for n in number_population]
    chance_weights = [chance_counts[n] + 1 for n in chance_population]

    selected: set[int] = set()
    while len(selected) < 5:
        selected.add(rng.choices(number_population, weights=number_weights, k=1)[0])

    return WeightedGrid(
        numbers=sorted(selected),
        chance=rng.choices(chance_population, weights=chance_weights, k=1)[0],
        method="Tirage aléatoire pondéré par fréquence historique lissée",
        warning=WARNING,
    )

def monte_carlo(draws: list[Draw], iterations: int = 10000, seed: int | None = None) -> dict:
    rng = random.Random(seed)
    hits = Counter()
    for _ in range(iterations):
        grid = set(rng.sample(range(1, 50), 5))
        for draw in draws[-50:]:
            hits[len(grid.intersection(draw.numbers))] += 1
    total = sum(hits.values()) or 1
    return {
        "iterations": iterations,
        "comparison_draws": min(50, len(draws)),
        "distribution": [
            {"matching_numbers": k, "count": hits[k], "ratio": hits[k] / total}
            for k in range(0, 6)
        ],
        "warning": WARNING,
    }
