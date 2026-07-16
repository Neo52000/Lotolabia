/**
 * Repli du générateur de grilles quand l'API FastAPI n'est pas joignable —
 * port fidèle des 6 méthodes de `backend/app/generator/grids.py` (aléatoire,
 * fréquence, retard, équilibrage, contrôle de somme, diversification).
 *
 * Le générateur ne dépend d'aucune donnée pour les méthodes aléatoire/
 * équilibrage/somme/diversification ; les méthodes fréquence et retard
 * utilisent les vrais tirages Supabase (`supabaseAllDraws`). Avertissement
 * obligatoire systématiquement attaché, vocabulaire proscrit jamais utilisé
 * (voir `generatorFallback.test.ts`).
 */

import type { Draw } from './api';

export const GENERATOR_DISCLAIMER =
  'Les tirages sont aléatoires. Les statistiques passées ne permettent pas de prévoir ' +
  'avec certitude les résultats futurs. Toute grille valide conserve la même probabilité ' +
  'théorique de gain.';

export type GeneratorMethod =
  | 'random'
  | 'frequency'
  | 'delay'
  | 'balanced'
  | 'sum_controlled'
  | 'diversified';

export interface GeneratedGrid {
  numbers: number[];
  chance: number;
  method: string;
  method_label: string;
  seed: number | null;
  warning: string;
}

const METHOD_LABELS: Record<GeneratorMethod, string> = {
  random: 'Aléatoire pur',
  frequency: 'Pondération par fréquence historique',
  delay: 'Pondération par retard observé',
  balanced: 'Équilibrage pair/impair et bas/haut',
  sum_controlled: 'Contrôle de la somme des numéros',
  diversified: 'Diversification entre grilles',
};

const MAX_ATTEMPTS = 500;

/** Générateur pseudo-aléatoire seedable (mulberry32) — déterministe pour une graine donnée. */
function makeRng(seed?: number | null): () => number {
  let state = (seed ?? Date.now()) >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(rng() * (maxInclusive - minInclusive + 1));
}

function sampleWithoutReplacement(rng: () => number, pool: number[], count: number): number[] {
  const copy = [...pool];
  const picked: number[] = [];
  for (let i = 0; i < count && copy.length > 0; i += 1) {
    const index = Math.floor(rng() * copy.length);
    picked.push(copy.splice(index, 1)[0]);
  }
  return picked;
}

/** Tirage pondéré avec remise, façon `random.choices` — jusqu'à obtenir 5 numéros distincts. */
function pickWeighted(rng: () => number, pool: number[], weights: number[], base: Set<number>): number[] {
  const selected = new Set(base);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let guard = 0;
  while (selected.size < 5 && guard < 10_000) {
    let target = rng() * totalWeight;
    let chosen = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i += 1) {
      target -= weights[i];
      if (target <= 0) {
        chosen = pool[i];
        break;
      }
    }
    selected.add(chosen);
    guard += 1;
  }
  if (selected.size < 5) {
    for (const n of sampleWithoutReplacement(rng, pool.filter((candidate) => !selected.has(candidate)), 5 - selected.size)) {
      selected.add(n);
    }
  }
  return [...selected].sort((a, b) => a - b);
}

function candidatePool(excludedNumbers: number[], favoriteNumbers: number[]): number[] {
  const excluded = new Set(excludedNumbers.filter((n) => !favoriteNumbers.includes(n)));
  const pool = Array.from({ length: 49 }, (_, i) => i + 1).filter((n) => !excluded.has(n));
  if (pool.length < 5) {
    throw new Error('Trop de numéros exclus pour former une grille.');
  }
  return pool;
}

function weightsByFrequency(draws: Draw[], pool: number[]): number[] {
  const counts = new Map<number, number>();
  for (const draw of draws) {
    for (const n of draw.numbers) counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  // Lissage +1 : les numéros jamais sortis restent tirables.
  return pool.map((n) => (counts.get(n) ?? 0) + 1);
}

/** Port fidèle de `_weights_by_delay` : plus un numéro est absent depuis longtemps, plus son poids est élevé. */
function weightsByDelay(draws: Draw[], pool: number[]): number[] {
  const lastSeen = new Map<number, number | null>(Array.from({ length: 49 }, (_, i) => [i + 1, null]));
  const reversed = [...draws].reverse();
  reversed.forEach((draw, index) => {
    for (const n of draw.numbers) {
      if (lastSeen.get(n) === null) lastSeen.set(n, index);
    }
  });
  const horizon = draws.length;
  return pool.map((n) => {
    const seen = lastSeen.get(n);
    return (seen === null || seen === undefined ? horizon : seen) + 1;
  });
}

function isBalanced(numbers: number[]): boolean {
  const even = numbers.filter((n) => n % 2 === 0).length;
  const low = numbers.filter((n) => n <= 24).length;
  return even >= 2 && even <= 3 && low >= 2 && low <= 3;
}

interface GenerateOptions {
  method: GeneratorMethod;
  count?: number;
  seed?: number | null;
  excludedNumbers?: number[];
  favoriteNumbers?: number[];
  sumMin?: number | null;
  sumMax?: number | null;
  draws?: Draw[]; // requis pour method === 'frequency' | 'delay'
}

function generateSingle(
  method: GeneratorMethod,
  pool: number[],
  favorites: Set<number>,
  draws: Draw[],
  sumMin: number | null,
  sumMax: number | null,
  rng: () => number,
  previous: number[][],
): number[] {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let numbers: number[];
    if (method === 'frequency') {
      numbers = pickWeighted(rng, pool, weightsByFrequency(draws, pool), favorites);
    } else if (method === 'delay') {
      numbers = pickWeighted(rng, pool, weightsByDelay(draws, pool), favorites);
    } else {
      const free = pool.filter((n) => !favorites.has(n));
      numbers = [...favorites, ...sampleWithoutReplacement(rng, free, 5 - favorites.size)].sort(
        (a, b) => a - b,
      );
    }

    if (method === 'balanced' && !isBalanced(numbers)) continue;
    if (method === 'sum_controlled') {
      const total = numbers.reduce((sum, n) => sum + n, 0);
      const lowBound = sumMin ?? 100;
      const highBound = sumMax ?? 150;
      if (total < lowBound || total > highBound) continue;
    }
    if (method === 'diversified' && previous.length > 0) {
      // Au plus 2 numéros en commun avec chaque grille déjà générée dans ce lot.
      const overlapsTooMuch = previous.some(
        (prior) => numbers.filter((n) => prior.includes(n)).length > 2,
      );
      if (overlapsTooMuch) continue;
    }
    return numbers;
  }
  throw new Error('Impossible de générer une grille respectant ces contraintes. Assouplissez-les.');
}

export function generateGrids(options: GenerateOptions): GeneratedGrid[] {
  const {
    method,
    count = 1,
    seed = null,
    excludedNumbers = [],
    favoriteNumbers = [],
    sumMin = null,
    sumMax = null,
    draws = [],
  } = options;

  if (sumMin !== null && sumMax !== null && sumMin > sumMax) {
    throw new Error('La somme minimale dépasse la somme maximale.');
  }
  if (favoriteNumbers.length > 5) {
    throw new Error('Au maximum cinq numéros favoris.');
  }

  const rng = makeRng(seed);
  const pool = candidatePool(excludedNumbers, favoriteNumbers);
  const favorites = new Set(favoriteNumbers);
  const grids: GeneratedGrid[] = [];
  const generatedNumbers: number[][] = [];

  for (let i = 0; i < count; i += 1) {
    const numbers = generateSingle(method, pool, favorites, draws, sumMin, sumMax, rng, generatedNumbers);
    generatedNumbers.push(numbers);
    grids.push({
      numbers,
      chance: randomInt(rng, 1, 10),
      method,
      method_label: METHOD_LABELS[method] ?? method,
      seed,
      warning: GENERATOR_DISCLAIMER,
    });
  }
  return grids;
}
