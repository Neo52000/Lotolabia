/**
 * Repli du profil détaillé par numéro (`/numero/[n]`, `/numero-chance/[n]`)
 * quand l'API FastAPI n'est pas joignable — port fidèle de
 * `backend/app/stats/engine.py::number_profile` et `number_cooccurrences`.
 */

import type { Draw } from './api';

export const MAIN_RANGE = Array.from({ length: 49 }, (_, i) => i + 1);
export const CHANCE_RANGE = Array.from({ length: 10 }, (_, i) => i + 1);

export interface Companion {
  number: number;
  count: number;
}

export interface NumberProfile {
  draw_count: number;
  period_start: string | null;
  period_end: string | null;
  explanation: string;
  disclaimer: string;
  number: number;
  is_chance: boolean;
  appearances: number;
  relative_frequency: number;
  current_delay: number | null;
  gap_mean: number | null;
  gap_min: number | null;
  gap_max: number | null;
  last_appearances: string[];
  top_companions?: Companion[];
}

/** `draws` doit être trié par date croissante — comme en base (ordre ascendant). */
export function computeCooccurrences(draws: Draw[], number: number, limit = 10): Companion[] {
  const counter = new Map<number, number>();
  for (const draw of draws) {
    if (draw.numbers.includes(number)) {
      for (const n of draw.numbers) {
        if (n !== number) counter.set(n, (counter.get(n) ?? 0) + 1);
      }
    }
  }
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([n, count]) => ({ number: n, count }));
}

/** `draws` doit être trié par date croissante. */
export function computeNumberProfile(
  draws: Draw[],
  number: number,
  isChance: boolean,
  disclaimer: string,
): NumberProfile {
  const validRange = isChance ? CHANCE_RANGE : MAIN_RANGE;
  if (!validRange.includes(number)) {
    throw new Error('Numéro hors plage.');
  }

  const positions: number[] = [];
  const lastDates: string[] = [];
  draws.forEach((draw, index) => {
    const present = isChance ? draw.chance === number : draw.numbers.includes(number);
    if (present) {
      positions.push(index);
      lastDates.push(draw.draw_date);
    }
  });

  const gaps = positions.slice(1).map((position, index) => position - positions[index]);
  const total = draws.length;

  const profile: NumberProfile = {
    draw_count: total,
    period_start: total > 0 ? draws[0].draw_date : null,
    period_end: total > 0 ? draws[total - 1].draw_date : null,
    explanation:
      'Profil descriptif du numéro : sorties, fréquence relative, retard actuel et écarts.',
    disclaimer,
    number,
    is_chance: isChance,
    appearances: positions.length,
    relative_frequency: total > 0 ? Math.round((positions.length / total) * 10000) / 10000 : 0,
    current_delay: positions.length > 0 ? total - 1 - positions[positions.length - 1] : null,
    gap_mean: gaps.length > 0 ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 100) / 100 : null,
    gap_min: gaps.length > 0 ? Math.min(...gaps) : null,
    gap_max: gaps.length > 0 ? Math.max(...gaps) : null,
    last_appearances: [...lastDates.slice(-10)].reverse(),
  };

  if (!isChance) {
    profile.top_companions = computeCooccurrences(draws, number, 5);
  }

  return profile;
}
