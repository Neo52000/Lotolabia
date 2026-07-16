import { describe, expect, it } from 'vitest';

import type { Draw } from './api';
import { generateGrids } from './generatorFallback';

const FORBIDDEN = ['gagnant', 'sûr', 'prédiction fiable', 'garantie'];

const DRAWS: Draw[] = [
  { id: 1, draw_date: '2020-01-04', numbers: [1, 2, 3, 4, 5], chance: 1, source: 'test' },
  { id: 2, draw_date: '2020-01-06', numbers: [1, 6, 7, 8, 9], chance: 2, source: 'test' },
];

describe('generateGrids — méthode random', () => {
  it('produit 5 numéros distincts entre 1 et 49 et un numéro Chance entre 1 et 10', () => {
    const [grid] = generateGrids({ method: 'random', seed: 42 });
    expect(new Set(grid.numbers).size).toBe(5);
    expect(grid.numbers.every((n) => n >= 1 && n <= 49)).toBe(true);
    expect(grid.chance).toBeGreaterThanOrEqual(1);
    expect(grid.chance).toBeLessThanOrEqual(10);
  });

  it('est reproductible avec la même graine', () => {
    const a = generateGrids({ method: 'random', seed: 123 });
    const b = generateGrids({ method: 'random', seed: 123 });
    expect(a).toEqual(b);
  });

  it('respecte les numéros favoris et exclusions', () => {
    const [grid] = generateGrids({
      method: 'random',
      seed: 7,
      favoriteNumbers: [1, 2],
      excludedNumbers: [3, 4, 5, 6],
    });
    expect(grid.numbers).toContain(1);
    expect(grid.numbers).toContain(2);
    for (const excluded of [3, 4, 5, 6]) expect(grid.numbers).not.toContain(excluded);
  });

  it("n'utilise jamais de vocabulaire proscrit", () => {
    const grids = generateGrids({ method: 'random', count: 5, seed: 1 });
    for (const grid of grids) {
      const text = `${grid.method_label} ${grid.warning}`.toLowerCase();
      for (const phrase of FORBIDDEN) expect(text).not.toContain(phrase);
    }
  });
});

describe('generateGrids — méthode frequency', () => {
  it("utilise l'historique fourni sans planter", () => {
    const [grid] = generateGrids({ method: 'frequency', seed: 1, draws: DRAWS });
    expect(new Set(grid.numbers).size).toBe(5);
  });

  it('fonctionne même sans historique (lissage +1)', () => {
    const [grid] = generateGrids({ method: 'frequency', seed: 1, draws: [] });
    expect(new Set(grid.numbers).size).toBe(5);
  });
});

describe('generateGrids — méthode delay', () => {
  it("utilise l'historique fourni sans planter", () => {
    const [grid] = generateGrids({ method: 'delay', seed: 1, draws: DRAWS });
    expect(new Set(grid.numbers).size).toBe(5);
  });

  it('fonctionne même sans historique (tous à égalité)', () => {
    const [grid] = generateGrids({ method: 'delay', seed: 1, draws: [] });
    expect(new Set(grid.numbers).size).toBe(5);
  });
});

describe('generateGrids — méthode balanced', () => {
  it('respecte toujours 2-3 pairs et 2-3 numéros ≤24', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const [grid] = generateGrids({ method: 'balanced', seed });
      const even = grid.numbers.filter((n) => n % 2 === 0).length;
      const low = grid.numbers.filter((n) => n <= 24).length;
      expect(even).toBeGreaterThanOrEqual(2);
      expect(even).toBeLessThanOrEqual(3);
      expect(low).toBeGreaterThanOrEqual(2);
      expect(low).toBeLessThanOrEqual(3);
    }
  });
});

describe('generateGrids — méthode sum_controlled', () => {
  it('respecte les bornes par défaut (100-150)', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const [grid] = generateGrids({ method: 'sum_controlled', seed });
      const total = grid.numbers.reduce((a, b) => a + b, 0);
      expect(total).toBeGreaterThanOrEqual(100);
      expect(total).toBeLessThanOrEqual(150);
    }
  });

  it('respecte des bornes personnalisées (plus étroites que les bornes par défaut)', () => {
    const [grid] = generateGrids({ method: 'sum_controlled', seed: 5, sumMin: 115, sumMax: 135 });
    const total = grid.numbers.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(115);
    expect(total).toBeLessThanOrEqual(135);
  });
});

describe('generateGrids — méthode diversified', () => {
  it('limite à 2 numéros communs maximum entre grilles du même lot', () => {
    const grids = generateGrids({ method: 'diversified', seed: 3, count: 4 });
    for (let i = 0; i < grids.length; i += 1) {
      for (let j = i + 1; j < grids.length; j += 1) {
        const overlap = grids[i].numbers.filter((n) => grids[j].numbers.includes(n)).length;
        expect(overlap).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe('generateGrids — contraintes impossibles', () => {
  it('lève une erreur si trop de numéros sont exclus', () => {
    const excludedNumbers = Array.from({ length: 45 }, (_, i) => i + 1);
    expect(() => generateGrids({ method: 'random', excludedNumbers })).toThrow();
  });

  it('lève une erreur si la somme minimale dépasse la somme maximale', () => {
    expect(() =>
      generateGrids({ method: 'sum_controlled', sumMin: 200, sumMax: 100 }),
    ).toThrow();
  });

  it('lève une erreur si plus de cinq numéros favoris', () => {
    expect(() =>
      generateGrids({ method: 'random', favoriteNumbers: [1, 2, 3, 4, 5, 6] }),
    ).toThrow();
  });
});
