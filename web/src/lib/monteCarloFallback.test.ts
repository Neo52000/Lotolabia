import { describe, expect, it } from 'vitest';

import { simulateRandomPlay } from './monteCarloFallback';

describe('simulateRandomPlay', () => {
  it('retourne une distribution complète (6 correspondances × 2 états Chance)', () => {
    const result = simulateRandomPlay(500, 1);
    expect(result.iterations).toBe(500);
    expect(result.distribution).toHaveLength(12);
    const total = result.distribution.reduce((sum, row) => sum + row.count, 0);
    expect(total).toBe(500);
  });

  it('la probabilité théorique du rang 1 correspond aux règles publiques du jeu', () => {
    const result = simulateRandomPlay(10, 1);
    expect(result.theoretical_jackpot_probability).toBeCloseTo(1 / 19_068_840, 12);
  });

  it('est reproductible avec la même graine', () => {
    const a = simulateRandomPlay(200, 42);
    const b = simulateRandomPlay(200, 42);
    expect(a.distribution).toEqual(b.distribution);
  });

  it("n'utilise jamais de vocabulaire proscrit", () => {
    const result = simulateRandomPlay(50, 1);
    const text = `${result.explanation} ${result.disclaimer}`.toLowerCase();
    for (const phrase of ['gagnant', 'sûr', 'prédiction fiable', 'garantie']) {
      expect(text).not.toContain(phrase);
    }
  });
});
