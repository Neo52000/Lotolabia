/**
 * Repli de calcul de statistiques descriptives quand l'API FastAPI n'est pas
 * joignable — port fidèle et volontairement minimal de
 * `backend/app/stats/engine.py` (fréquences, retards, synthèse) pour les
 * seules pages qui en ont besoin sans backend hébergé.
 *
 * Ne couvre PAS le générateur de grilles, les simulations Monte-Carlo, les
 * paires/triplets/cooccurrences ni les écarts min/moy/max : cette logique
 * reste servie exclusivement par l'API pour éviter toute divergence entre
 * deux implémentations d'un même calcul.
 */

import type { Draw, NumberStat, StatsPayload } from './api';

export const MAIN_RANGE = Array.from({ length: 49 }, (_, i) => i + 1);
export const CHANCE_RANGE = Array.from({ length: 10 }, (_, i) => i + 1);

interface BaseFields {
  draw_count: number;
  period_start: string | null;
  period_end: string | null;
  explanation: string;
  disclaimer: string;
}

function base(draws: Draw[], explanation: string, disclaimer: string): BaseFields {
  return {
    draw_count: draws.length,
    period_start: draws.length > 0 ? draws[0].draw_date : null,
    period_end: draws.length > 0 ? draws[draws.length - 1].draw_date : null,
    explanation,
    disclaimer,
  };
}

/** `draws` doit être trié par date croissante — comme en base (ordre ascendant). */
export function computeFrequencies(draws: Draw[], disclaimer: string): StatsPayload {
  const mainCounts = new Map<number, number>();
  const chanceCounts = new Map<number, number>();
  for (const draw of draws) {
    for (const n of draw.numbers) mainCounts.set(n, (mainCounts.get(n) ?? 0) + 1);
    chanceCounts.set(draw.chance, (chanceCounts.get(draw.chance) ?? 0) + 1);
  }
  const total = draws.length;
  const result = base(
    draws,
    'Fréquence absolue : nombre de sorties du numéro sur la période. ' +
      'Fréquence relative : part des tirages où le numéro est sorti.',
    disclaimer,
  );
  const numbers: NumberStat[] = MAIN_RANGE.map((n) => {
    const count = mainCounts.get(n) ?? 0;
    return { number: n, count, relative: total ? Math.round((count / total) * 10000) / 10000 : 0 };
  });
  const chance: NumberStat[] = CHANCE_RANGE.map((n) => {
    const count = chanceCounts.get(n) ?? 0;
    return { number: n, count, relative: total ? Math.round((count / total) * 10000) / 10000 : 0 };
  });
  return { ...result, numbers, chance };
}

/** `draws` doit être trié par date croissante. */
export function computeDelays(draws: Draw[], disclaimer: string): StatsPayload {
  const mainDelay = new Map<number, number | null>(MAIN_RANGE.map((n) => [n, null]));
  const chanceDelay = new Map<number, number | null>(CHANCE_RANGE.map((n) => [n, null]));
  const reversed = [...draws].reverse();
  reversed.forEach((draw, index) => {
    for (const n of draw.numbers) {
      if (mainDelay.get(n) === null) mainDelay.set(n, index);
    }
    if (chanceDelay.get(draw.chance) === null) chanceDelay.set(draw.chance, index);
  });
  const result = base(
    draws,
    'Retard : nombre de tirages écoulés depuis la dernière sortie du numéro ' +
      '(0 = présent au dernier tirage, null = jamais sorti sur la période). ' +
      "Un retard élevé n'augmente pas la probabilité de sortie au prochain tirage.",
    disclaimer,
  );
  const numbers: NumberStat[] = MAIN_RANGE.map((n) => ({ number: n, delay: mainDelay.get(n) ?? null }));
  const chance: NumberStat[] = CHANCE_RANGE.map((n) => ({ number: n, delay: chanceDelay.get(n) ?? null }));
  return { ...result, numbers, chance };
}

export function computeOverview(draws: Draw[], disclaimer: string): Record<string, unknown> {
  const freq = computeFrequencies(draws, disclaimer);
  const delay = computeDelays(draws, disclaimer);
  const sortedByCount = [...freq.numbers].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  const delayed = delay.numbers.filter((item) => item.delay !== null && item.delay !== undefined);
  const sortedByDelay = [...delayed].sort((a, b) => (b.delay ?? 0) - (a.delay ?? 0));
  return {
    ...base(
      draws,
      'Synthèse descriptive : numéros les plus/moins sortis et retards les plus longs.',
      disclaimer,
    ),
    most_frequent: sortedByCount.slice(0, 5),
    least_frequent: draws.length > 0 ? [...sortedByCount.slice(-5)].reverse() : [],
    longest_delays: sortedByDelay.slice(0, 5),
  };
}

export function applyWindow(draws: Draw[], window?: number): Draw[] {
  if (!window || window <= 0) return draws;
  return draws.slice(-window);
}
