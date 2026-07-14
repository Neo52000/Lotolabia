"""Simulations Monte-Carlo.

Deux simulations descriptives et pédagogiques :
  * `simulate_grid_against_history` — confronte une grille donnée à l'historique
    réel pour montrer la distribution des correspondances observées ;
  * `simulate_random_play` — simule un grand nombre de grilles aléatoires contre
    des tirages aléatoires pour illustrer les probabilités théoriques.

Aucune de ces simulations n'estime une « chance de gagner » de la grille :
la probabilité théorique reste identique pour toute grille valide, et le
résultat inclut systématiquement l'avertissement obligatoire.
"""

import random
from collections import Counter

from ..schemas.draws import Draw
from .disclaimers import STATS_DISCLAIMER


def simulate_grid_against_history(
    draws: list[Draw], numbers: list[int], chance: int
) -> dict:
    grid = set(numbers)
    matches = Counter()
    chance_matches = 0
    for draw in draws:
        matches[len(grid.intersection(draw.numbers))] += 1
        if draw.chance == chance:
            chance_matches += 1
    total = len(draws) or 1
    return {
        "kind": "grid_vs_history",
        "draw_count": len(draws),
        "numbers": sorted(numbers),
        "chance": chance,
        "match_distribution": [
            {"matching_numbers": k, "draws": matches[k], "ratio": round(matches[k] / total, 4)}
            for k in range(6)
        ],
        "chance_matches": chance_matches,
        "explanation": (
            "Distribution du nombre de numéros de cette grille retrouvés dans chaque "
            "tirage passé. Résultat purement descriptif : il ne dit rien du prochain tirage."
        ),
        "disclaimer": STATS_DISCLAIMER,
    }


def simulate_random_play(
    iterations: int = 10_000, seed: int | None = None
) -> dict:
    rng = random.Random(seed)
    outcomes = Counter()
    for _ in range(iterations):
        grid = set(rng.sample(range(1, 50), 5))
        grid_chance = rng.randint(1, 10)
        winning = set(rng.sample(range(1, 50), 5))
        winning_chance = rng.randint(1, 10)
        outcomes[(len(grid & winning), grid_chance == winning_chance)] += 1

    distribution = []
    for matched in range(6):
        for chance_hit in (False, True):
            count = outcomes[(matched, chance_hit)]
            distribution.append(
                {
                    "matching_numbers": matched,
                    "chance_matched": chance_hit,
                    "count": count,
                    "ratio": round(count / iterations, 6),
                }
            )
    return {
        "kind": "random_play",
        "iterations": iterations,
        "seed": seed,
        "distribution": distribution,
        "theoretical_jackpot_probability": round(1 / 19_068_840, 12),
        "explanation": (
            "Simulation de grilles aléatoires contre des tirages aléatoires, pour illustrer "
            "les probabilités théoriques (1 chance sur 19 068 840 pour le rang 1 : "
            "5 bons numéros sur 49 et le bon numéro Chance sur 10)."
        ),
        "disclaimer": STATS_DISCLAIMER,
    }
