/**
 * Repli de la simulation Monte-Carlo (grilles aléatoires vs tirages
 * aléatoires) quand l'API FastAPI n'est pas joignable — port fidèle de
 * `simulate_random_play` (backend/app/stats/montecarlo.py). Purement
 * combinatoire : aucune donnée de tirage réelle nécessaire.
 */

export const STATS_DISCLAIMER =
  'Les tirages sont aléatoires. Les statistiques passées ne permettent pas de prévoir ' +
  'avec certitude les résultats futurs. Toute grille valide conserve la même probabilité ' +
  'théorique de gain.';

export interface DistributionRow {
  matching_numbers: number;
  chance_matched: boolean;
  count: number;
  ratio: number;
}

export interface RandomPlayResult {
  kind: 'random_play';
  iterations: number;
  seed: number | null;
  distribution: DistributionRow[];
  theoretical_jackpot_probability: number;
  explanation: string;
  disclaimer: string;
}

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

function sample5(rng: () => number): number[] {
  const pool = Array.from({ length: 49 }, (_, i) => i + 1);
  const picked: number[] = [];
  for (let i = 0; i < 5; i += 1) {
    const index = Math.floor(rng() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

export function simulateRandomPlay(iterations = 1000, seed: number | null = null): RandomPlayResult {
  const rng = makeRng(seed);
  const outcomes = new Map<string, number>();
  for (let i = 0; i < iterations; i += 1) {
    const grid = new Set(sample5(rng));
    const gridChance = 1 + Math.floor(rng() * 10);
    const winning = new Set(sample5(rng));
    const winningChance = 1 + Math.floor(rng() * 10);
    let matched = 0;
    for (const n of grid) if (winning.has(n)) matched += 1;
    const key = `${matched}:${gridChance === winningChance}`;
    outcomes.set(key, (outcomes.get(key) ?? 0) + 1);
  }

  const distribution: DistributionRow[] = [];
  for (let matched = 0; matched <= 5; matched += 1) {
    for (const chanceHit of [false, true]) {
      const count = outcomes.get(`${matched}:${chanceHit}`) ?? 0;
      distribution.push({
        matching_numbers: matched,
        chance_matched: chanceHit,
        count,
        ratio: Math.round((count / iterations) * 1_000_000) / 1_000_000,
      });
    }
  }

  return {
    kind: 'random_play',
    iterations,
    seed,
    distribution,
    theoretical_jackpot_probability: 1 / 19_068_840,
    explanation:
      'Simulation de grilles aléatoires contre des tirages aléatoires, pour illustrer ' +
      'les probabilités théoriques (1 chance sur 19 068 840 pour le rang 1 : ' +
      '5 bons numéros sur 49 et le bon numéro Chance sur 10).',
    disclaimer: STATS_DISCLAIMER,
  };
}
