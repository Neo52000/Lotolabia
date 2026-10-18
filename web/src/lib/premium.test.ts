import { describe, expect, it } from 'vitest';

import { TIER_LIMITS, canUseMethod, isEntitlementActive, tierFor } from './premium';

const NOW = new Date('2026-10-18T12:00:00Z');

describe('paliers (port de backend/app/services/premium.py)', () => {
  it('anonyme : aléatoire seul, 1 grille, 1 000 itérations', () => {
    expect(TIER_LIMITS.anonymous).toMatchObject({ maxGrids: 1, maxIterations: 1_000 });
    expect(canUseMethod('anonymous', 'random')).toBe(true);
    expect(canUseMethod('anonymous', 'frequency')).toBe(false);
  });

  it('gratuit : aléatoire + fréquence, 3 grilles, 10 000 itérations', () => {
    expect(TIER_LIMITS.free).toMatchObject({ maxGrids: 3, maxIterations: 10_000 });
    expect(canUseMethod('free', 'frequency')).toBe(true);
    expect(canUseMethod('free', 'balanced')).toBe(false);
  });

  it('premium : les 6 méthodes, 20 grilles, 250 000 itérations', () => {
    expect(TIER_LIMITS.premium).toMatchObject({ maxGrids: 20, maxIterations: 250_000 });
    for (const method of ['random', 'frequency', 'delay', 'balanced', 'sum_controlled', 'diversified'] as const) {
      expect(canUseMethod('premium', method)).toBe(true);
    }
  });
});

describe('statut Premium', () => {
  it('un droit actif sans expiration donne Premium', () => {
    expect(tierFor(true, [{ id: 1, status: 'active', expires_at: null }], NOW)).toBe('premium');
  });

  it('un droit expiré ou révoqué ne donne pas Premium', () => {
    expect(isEntitlementActive({ id: 1, status: 'active', expires_at: '2026-10-01T00:00:00Z' }, NOW)).toBe(false);
    expect(isEntitlementActive({ id: 2, status: 'revoked', expires_at: null }, NOW)).toBe(false);
    expect(
      tierFor(true, [{ id: 2, status: 'revoked', expires_at: null }], NOW),
    ).toBe('free');
  });

  it('un visiteur non connecté reste anonyme, même avec un droit en mémoire', () => {
    expect(tierFor(false, [{ id: 1, status: 'active', expires_at: null }], NOW)).toBe('anonymous');
  });
});
