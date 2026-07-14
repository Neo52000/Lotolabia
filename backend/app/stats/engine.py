"""Moteur d'analyse statistique des tirages.

Toutes les fonctions :
  * sont descriptives — elles n'annoncent jamais une capacité prédictive ;
  * acceptent une liste de tirages triée par date croissante ;
  * retournent des dictionnaires sérialisables incluant l'avertissement
    obligatoire (`disclaimer`) et une explication pédagogique (`explanation`).

Conventions :
  * « retard » (delay) : nombre de tirages écoulés depuis la dernière sortie
    d'un numéro ; 0 = sorti au dernier tirage ; None = jamais sorti sur la
    période analysée ;
  * « écart » (gap) : nombre de tirages entre deux sorties consécutives d'un
    même numéro.
"""

from collections import Counter
from itertools import combinations
from statistics import mean, median, pstdev

from ..schemas.draws import Draw
from .disclaimers import STATS_DISCLAIMER

MAIN_RANGE = range(1, 50)
CHANCE_RANGE = range(1, 11)
WINDOWS = (10, 20, 50, 100)


def apply_window(draws: list[Draw], window: int | None) -> list[Draw]:
    """Restreint l'analyse aux `window` derniers tirages (None = historique complet)."""
    if window is None or window <= 0:
        return draws
    return draws[-window:]


def _base(draws: list[Draw], explanation: str) -> dict:
    return {
        "draw_count": len(draws),
        "period_start": draws[0].draw_date.isoformat() if draws else None,
        "period_end": draws[-1].draw_date.isoformat() if draws else None,
        "explanation": explanation,
        "disclaimer": STATS_DISCLAIMER,
    }


# ---------------------------------------------------------------------------
# Fréquences
# ---------------------------------------------------------------------------
def frequencies(draws: list[Draw]) -> dict:
    main = Counter()
    chance = Counter()
    for draw in draws:
        main.update(draw.numbers)
        chance.update([draw.chance])
    total = len(draws)
    result = _base(
        draws,
        "Fréquence absolue : nombre de sorties du numéro sur la période. "
        "Fréquence relative : part des tirages où le numéro est sorti.",
    )
    result["numbers"] = [
        {
            "number": n,
            "count": main[n],
            "relative": round(main[n] / total, 4) if total else 0.0,
        }
        for n in MAIN_RANGE
    ]
    result["chance"] = [
        {
            "number": n,
            "count": chance[n],
            "relative": round(chance[n] / total, 4) if total else 0.0,
        }
        for n in CHANCE_RANGE
    ]
    return result


# ---------------------------------------------------------------------------
# Retards
# ---------------------------------------------------------------------------
def delays(draws: list[Draw]) -> dict:
    main_delay: dict[int, int | None] = {n: None for n in MAIN_RANGE}
    chance_delay: dict[int, int | None] = {n: None for n in CHANCE_RANGE}
    for index, draw in enumerate(reversed(draws)):
        for number in draw.numbers:
            if main_delay[number] is None:
                main_delay[number] = index
        if chance_delay[draw.chance] is None:
            chance_delay[draw.chance] = index
    result = _base(
        draws,
        "Retard : nombre de tirages écoulés depuis la dernière sortie du numéro "
        "(0 = présent au dernier tirage, null = jamais sorti sur la période). "
        "Un retard élevé n'augmente pas la probabilité de sortie au prochain tirage.",
    )
    result["numbers"] = [{"number": n, "delay": main_delay[n]} for n in MAIN_RANGE]
    result["chance"] = [{"number": n, "delay": chance_delay[n]} for n in CHANCE_RANGE]
    return result


# ---------------------------------------------------------------------------
# Écarts entre sorties (min / moyen / max) et cycles
# ---------------------------------------------------------------------------
def gaps(draws: list[Draw]) -> dict:
    appearances: dict[int, list[int]] = {n: [] for n in MAIN_RANGE}
    for index, draw in enumerate(draws):
        for number in draw.numbers:
            appearances[number].append(index)

    entries = []
    for n in MAIN_RANGE:
        positions = appearances[n]
        number_gaps = [b - a for a, b in zip(positions, positions[1:], strict=False)]
        entries.append(
            {
                "number": n,
                "appearances": len(positions),
                "gap_min": min(number_gaps) if number_gaps else None,
                "gap_max": max(number_gaps) if number_gaps else None,
                "gap_mean": round(mean(number_gaps), 2) if number_gaps else None,
            }
        )
    result = _base(
        draws,
        "Écart : nombre de tirages entre deux sorties consécutives d'un numéro. "
        "L'écart moyen décrit le cycle moyen observé sur la période, sans valeur prédictive.",
    )
    result["numbers"] = entries
    return result


# ---------------------------------------------------------------------------
# Paires, triplets, cooccurrences
# ---------------------------------------------------------------------------
def combinations_stats(draws: list[Draw], size: int = 2, limit: int = 20) -> dict:
    if size not in (2, 3):
        raise ValueError("Seules les paires (2) et triplets (3) sont supportés.")
    counter = Counter()
    for draw in draws:
        counter.update(combinations(draw.numbers, size))
    label = "paires" if size == 2 else "triplets"
    result = _base(
        draws,
        f"Cooccurrences : {label} de numéros sortis ensemble le plus souvent sur la période.",
    )
    result["combinations"] = [
        {"numbers": list(combo), "count": count}
        for combo, count in counter.most_common(limit)
    ]
    return result


def number_cooccurrences(draws: list[Draw], number: int, limit: int = 10) -> dict:
    counter = Counter()
    appearances = 0
    for draw in draws:
        if number in draw.numbers:
            appearances += 1
            counter.update(n for n in draw.numbers if n != number)
    result = _base(
        draws,
        f"Numéros sortis le plus souvent dans le même tirage que le {number}.",
    )
    result["number"] = number
    result["appearances"] = appearances
    result["companions"] = [
        {"number": n, "count": c} for n, c in counter.most_common(limit)
    ]
    return result


# ---------------------------------------------------------------------------
# Formes de tirage : consécutifs, dizaines, pair/impair, bas/haut,
# somme, amplitude, médiane, dispersion
# ---------------------------------------------------------------------------
def draw_shapes(draws: list[Draw]) -> dict:
    consecutive_counts = Counter()
    decade_counter = Counter()
    even_distribution = Counter()
    low_distribution = Counter()
    sums: list[int] = []
    amplitudes: list[int] = []

    for draw in draws:
        numbers = sorted(draw.numbers)
        consecutive_pairs = sum(1 for a, b in zip(numbers, numbers[1:], strict=False) if b - a == 1)
        consecutive_counts[consecutive_pairs] += 1
        for n in numbers:
            decade_counter[(n - 1) // 10] += 1
        even_distribution[sum(1 for n in numbers if n % 2 == 0)] += 1
        low_distribution[sum(1 for n in numbers if n <= 24)] += 1
        sums.append(sum(numbers))
        amplitudes.append(numbers[-1] - numbers[0])

    result = _base(
        draws,
        "Formes de tirage : répartitions descriptives (numéros consécutifs, dizaines, "
        "pairs/impairs, bas [1-24] / haut [25-49], somme, amplitude) observées sur la période.",
    )
    result["consecutive"] = [
        {"consecutive_pairs": k, "draws": consecutive_counts[k]}
        for k in sorted(consecutive_counts)
    ]
    result["decades"] = [
        {
            "decade": f"{d * 10 + 1 if d > 0 else 1}-{min(d * 10 + 10, 49) if d > 0 else 9}",
            "count": decade_counter[d],
        }
        for d in range(5)
    ]
    result["even_odd"] = [
        {"even_count": k, "draws": even_distribution[k]} for k in range(6)
    ]
    result["low_high"] = [
        {"low_count": k, "draws": low_distribution[k]} for k in range(6)
    ]
    result["sum"] = {
        "min": min(sums) if sums else None,
        "max": max(sums) if sums else None,
        "mean": round(mean(sums), 2) if sums else None,
        "median": median(sums) if sums else None,
        "std_dev": round(pstdev(sums), 2) if len(sums) > 1 else None,
    }
    result["amplitude"] = {
        "min": min(amplitudes) if amplitudes else None,
        "max": max(amplitudes) if amplitudes else None,
        "mean": round(mean(amplitudes), 2) if amplitudes else None,
        "median": median(amplitudes) if amplitudes else None,
    }
    return result


# ---------------------------------------------------------------------------
# Analyses par période et comparaisons
# ---------------------------------------------------------------------------
def by_period(draws: list[Draw], granularity: str = "year") -> dict:
    if granularity not in ("year", "month"):
        raise ValueError("Granularité inconnue (year ou month).")
    buckets: dict[str, list[Draw]] = {}
    for draw in draws:
        key = (
            str(draw.draw_date.year)
            if granularity == "year"
            else f"{draw.draw_date.year}-{draw.draw_date.month:02d}"
        )
        buckets.setdefault(key, []).append(draw)

    periods = []
    for key in sorted(buckets):
        bucket = buckets[key]
        counter = Counter()
        for draw in bucket:
            counter.update(draw.numbers)
        top = counter.most_common(5)
        periods.append(
            {
                "period": key,
                "draw_count": len(bucket),
                "top_numbers": [{"number": n, "count": c} for n, c in top],
                "sum_mean": round(mean(sum(d.numbers) for d in bucket), 2),
            }
        )
    result = _base(
        draws,
        "Synthèse par période : volume de tirages, numéros les plus sortis et somme moyenne.",
    )
    result["granularity"] = granularity
    result["periods"] = periods
    return result


def compare_windows(draws: list[Draw], window_a: int, window_b: int) -> dict:
    """Compare les fréquences entre deux fenêtres récentes (ex. 20 vs 100 derniers tirages)."""
    freq_a = Counter()
    freq_b = Counter()
    for draw in apply_window(draws, window_a):
        freq_a.update(draw.numbers)
    for draw in apply_window(draws, window_b):
        freq_b.update(draw.numbers)
    len_a = len(apply_window(draws, window_a))
    len_b = len(apply_window(draws, window_b))
    result = _base(
        draws,
        "Comparaison des fréquences relatives entre deux fenêtres d'analyse. Les écarts "
        "observés sont des fluctuations normales d'un processus aléatoire.",
    )
    result["window_a"] = len_a
    result["window_b"] = len_b
    result["numbers"] = [
        {
            "number": n,
            "relative_a": round(freq_a[n] / len_a, 4) if len_a else 0.0,
            "relative_b": round(freq_b[n] / len_b, 4) if len_b else 0.0,
        }
        for n in MAIN_RANGE
    ]
    return result


def number_profile(draws: list[Draw], number: int, is_chance: bool = False) -> dict:
    """Fiche complète d'un numéro (pages SEO « par numéro » et écrans détail)."""
    valid_range = CHANCE_RANGE if is_chance else MAIN_RANGE
    if number not in valid_range:
        raise ValueError("Numéro hors plage.")
    positions: list[int] = []
    last_dates: list[str] = []
    for index, draw in enumerate(draws):
        present = (draw.chance == number) if is_chance else (number in draw.numbers)
        if present:
            positions.append(index)
            last_dates.append(draw.draw_date.isoformat())
    number_gaps = [b - a for a, b in zip(positions, positions[1:], strict=False)]
    total = len(draws)
    result = _base(
        draws,
        "Profil descriptif du numéro : sorties, fréquence relative, retard actuel et écarts.",
    )
    result.update(
        {
            "number": number,
            "is_chance": is_chance,
            "appearances": len(positions),
            "relative_frequency": round(len(positions) / total, 4) if total else 0.0,
            "current_delay": (total - 1 - positions[-1]) if positions else None,
            "gap_mean": round(mean(number_gaps), 2) if number_gaps else None,
            "gap_min": min(number_gaps) if number_gaps else None,
            "gap_max": max(number_gaps) if number_gaps else None,
            "last_appearances": list(reversed(last_dates[-10:])),
        }
    )
    if not is_chance:
        companions = number_cooccurrences(draws, number, limit=5)
        result["top_companions"] = companions["companions"]
    return result


def overview(draws: list[Draw]) -> dict:
    """Synthèse pour l'accueil : dernier tirage + indicateurs descriptifs clés."""
    freq = frequencies(draws)
    delay = delays(draws)
    sorted_by_count = sorted(freq["numbers"], key=lambda item: -item["count"])
    delayed = [d for d in delay["numbers"] if d["delay"] is not None]
    sorted_by_delay = sorted(delayed, key=lambda item: -item["delay"])
    result = _base(
        draws,
        "Synthèse descriptive : numéros les plus/moins sortis et retards les plus longs.",
    )
    result["most_frequent"] = sorted_by_count[:5]
    result["least_frequent"] = sorted_by_count[-5:][::-1] if draws else []
    result["longest_delays"] = sorted_by_delay[:5]
    return result
