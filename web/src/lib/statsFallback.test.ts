import { describe, expect, it } from 'vitest';

import type { Draw } from './api';
import { computeDelays, computeFrequencies, computeOverview } from './statsFallback';

const DISCLAIMER_TEST = 'avertissement de test';

// Mêmes fixtures que backend/tests/test_stats.py (résultats vérifiés à la main),
// pour garantir que ce repli TypeScript reproduit fidèlement le moteur Python.
const DRAWS: Draw[] = [
  { id: 1, draw_date: '2020-01-04', numbers: [1, 2, 3, 4, 5], chance: 1, source: 'test' },
  { id: 2, draw_date: '2020-01-06', numbers: [1, 6, 7, 8, 9], chance: 2, source: 'test' },
  { id: 3, draw_date: '2020-01-08', numbers: [1, 2, 10, 20, 30], chance: 1, source: 'test' },
  { id: 4, draw_date: '2020-01-11', numbers: [40, 41, 45, 47, 49], chance: 5, source: 'test' },
];

describe('computeFrequencies', () => {
  it('reproduit les fréquences absolues et relatives du moteur Python', () => {
    const result = computeFrequencies(DRAWS, DISCLAIMER_TEST);
    const one = result.numbers.find((item) => item.number === 1)!;
    expect(one.count).toBe(3);
    expect(one.relative).toBe(0.75);
    const chanceOne = result.chance.find((item) => item.number === 1)!;
    expect(chanceOne.count).toBe(2);
    expect(result.disclaimer).toBe(DISCLAIMER_TEST);
    expect(result.draw_count).toBe(4);
    expect(result.period_start).toBe('2020-01-04');
    expect(result.period_end).toBe('2020-01-11');
  });
});

describe('computeDelays', () => {
  it('reproduit les retards du moteur Python', () => {
    const result = computeDelays(DRAWS, DISCLAIMER_TEST);
    const delays = new Map(result.numbers.map((item) => [item.number, item.delay]));
    expect(delays.get(40)).toBe(0); // dernier tirage
    expect(delays.get(1)).toBe(1); // avant-dernier
    expect(delays.get(5)).toBe(3);
    expect(delays.get(13)).toBeNull(); // jamais sorti
  });
});

describe('computeOverview', () => {
  it('retourne les numéros les plus fréquents et les plus en retard', () => {
    const result = computeOverview(DRAWS, DISCLAIMER_TEST) as {
      most_frequent: { number: number; count?: number }[];
      longest_delays: { number: number; delay?: number | null }[];
    };
    expect(result.most_frequent[0].number).toBe(1);
    expect(result.most_frequent[0].count).toBe(3);
    expect(result.longest_delays.length).toBeGreaterThan(0);
  });

  it('gère un historique vide sans planter (fidèle au moteur Python : least_frequent vide)', () => {
    const result = computeOverview([], DISCLAIMER_TEST) as { least_frequent: unknown[]; draw_count: number };
    expect(result.least_frequent).toEqual([]);
    expect(result.draw_count).toBe(0);
  });
});
