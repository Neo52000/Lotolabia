"""Générateur de grilles expérimentales.

Méthodes disponibles (toutes descriptives et expérimentales) :
  * random          — aléatoire pur ;
  * frequency       — pondération par fréquence historique lissée ;
  * delay           — pondération par retard observé ;
  * balanced        — équilibrage pair/impair et bas/haut ;
  * sum_controlled  — contrôle de la somme des numéros ;
  * diversified     — diversification entre les grilles générées.

Options transverses : exclusions personnalisées, numéros favoris imposés,
génération multiple, graine (`seed`) pour une génération reproductible.

Chaque grille embarque l'avertissement obligatoire : aucune méthode ne
modifie la probabilité théorique de gain.
"""

import random
from collections import Counter

from ..core.errors import AppError
from ..schemas.draws import Draw
from ..schemas.grids import GeneratedGrid, GenerationRequest
from ..stats.disclaimers import GENERATOR_DISCLAIMER

METHOD_LABELS = {
    "random": "Aléatoire pur",
    "frequency": "Pondération par fréquence historique",
    "delay": "Pondération par retard observé",
    "balanced": "Équilibrage pair/impair et bas/haut",
    "sum_controlled": "Contrôle de la somme des numéros",
    "diversified": "Diversification entre grilles",
}

_MAX_ATTEMPTS = 500


def _candidate_pool(request: GenerationRequest) -> list[int]:
    excluded = set(request.excluded_numbers) - set(request.favorite_numbers)
    pool = [n for n in range(1, 50) if n not in excluded]
    if len(pool) < 5 or len(set(request.favorite_numbers) | set(pool)) < 5:
        raise AppError("invalid_constraints", "Trop de numéros exclus pour former une grille.")
    return pool


def _weights_by_frequency(draws: list[Draw], pool: list[int]) -> list[float]:
    counts = Counter()
    for draw in draws:
        counts.update(draw.numbers)
    # lissage +1 : les numéros jamais sortis restent tirables
    return [counts[n] + 1.0 for n in pool]


def _weights_by_delay(draws: list[Draw], pool: list[int]) -> list[float]:
    last_seen: dict[int, int | None] = {n: None for n in range(1, 50)}
    for index, draw in enumerate(reversed(draws)):
        for number in draw.numbers:
            if last_seen[number] is None:
                last_seen[number] = index
    horizon = len(draws)
    return [
        float((last_seen[n] if last_seen[n] is not None else horizon) + 1)
        for n in pool
    ]


def _pick_weighted(
    rng: random.Random, pool: list[int], weights: list[float], base: set[int]
) -> list[int]:
    selected = set(base)
    guard = 0
    while len(selected) < 5:
        selected.add(rng.choices(pool, weights=weights, k=1)[0])
        guard += 1
        if guard > 10_000:  # jeu de poids dégénéré
            remaining = [n for n in pool if n not in selected]
            selected.update(rng.sample(remaining, 5 - len(selected)))
    return sorted(selected)


def _is_balanced(numbers: list[int]) -> bool:
    even = sum(1 for n in numbers if n % 2 == 0)
    low = sum(1 for n in numbers if n <= 24)
    return 2 <= even <= 3 and 2 <= low <= 3


def _generate_single(
    request: GenerationRequest,
    draws: list[Draw],
    rng: random.Random,
    previous: list[list[int]],
) -> list[int]:
    pool = _candidate_pool(request)
    favorites = set(request.favorite_numbers)

    for _ in range(_MAX_ATTEMPTS):
        if request.method == "frequency":
            numbers = _pick_weighted(rng, pool, _weights_by_frequency(draws, pool), favorites)
        elif request.method == "delay":
            numbers = _pick_weighted(rng, pool, _weights_by_delay(draws, pool), favorites)
        else:
            free = [n for n in pool if n not in favorites]
            numbers = sorted(favorites | set(rng.sample(free, 5 - len(favorites))))

        if request.method == "balanced" and not _is_balanced(numbers):
            continue
        if request.method == "sum_controlled":
            total = sum(numbers)
            low_bound = request.sum_min if request.sum_min is not None else 100
            high_bound = request.sum_max if request.sum_max is not None else 150
            if not (low_bound <= total <= high_bound):
                continue
        if request.method == "diversified" and previous:
            # au plus 2 numéros en commun avec chaque grille déjà générée
            if any(len(set(numbers) & set(prior)) > 2 for prior in previous):
                continue
        return numbers

    raise AppError(
        "generation_failed",
        "Impossible de générer une grille respectant ces contraintes. Assouplissez-les.",
    )


def generate(request: GenerationRequest, draws: list[Draw]) -> list[GeneratedGrid]:
    if (
        request.sum_min is not None
        and request.sum_max is not None
        and request.sum_min > request.sum_max
    ):
        raise AppError("invalid_constraints", "La somme minimale dépasse la somme maximale.")
    if len(request.favorite_numbers) > 5:
        raise AppError("invalid_constraints", "Au maximum cinq numéros favoris.")

    rng = random.Random(request.seed)
    grids: list[GeneratedGrid] = []
    generated_numbers: list[list[int]] = []
    for _ in range(request.count):
        numbers = _generate_single(request, draws, rng, generated_numbers)
        generated_numbers.append(numbers)
        grids.append(
            GeneratedGrid(
                numbers=numbers,
                chance=rng.randint(1, 10),
                method=request.method,
                method_label=METHOD_LABELS[request.method],
                seed=request.seed,
                warning=GENERATOR_DISCLAIMER,
            )
        )
    return grids
