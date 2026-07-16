import { describe, expect, it } from 'vitest';

import type { Draw } from './api';
import { computeNumberProfile } from './numberProfileFallback';

const DISCLAIMER_TEST = 'avertissement de test';

// Mêmes fixtures que backend/tests/test_stats.py::test_number_profile.
const DRAWS: Draw[] = [
  { id: 1, draw_date: '2020-01-04', numbers: [1, 2, 3, 4, 5], chance: 1, source: 'test' },
  { id: 2, draw_date: '2020-01-06', numbers: [1, 6, 7, 8, 9], chance: 2, source: 'test' },
  { id: 3, draw_date: '2020-01-08', numbers: [1, 2, 10, 20, 30], chance: 1, source: 'test' },
  { id: 4, draw_date: '2020-01-11', numbers: [40, 41, 45, 47, 49], chance: 5, source: 'test' },
];

describe('computeNumberProfile', () => {
  it('reproduit le profil du moteur Python pour un numéro principal', () => {
    const profile = computeNumberProfile(DRAWS, 1, false, DISCLAIMER_TEST);
    expect(profile.appearances).toBe(3);
    expect(profile.current_delay).toBe(1);
    expect(profile.top_companions?.[0]?.number).toBe(2);
  });

  it('reproduit le profil du moteur Python pour un numéro Chance', () => {
    const profile = computeNumberProfile(DRAWS, 1, true, DISCLAIMER_TEST);
    expect(profile.appearances).toBe(2);
    expect(profile.top_companions).toBeUndefined();
  });

  it('lève une erreur pour un numéro hors plage', () => {
    expect(() => computeNumberProfile(DRAWS, 50, false, DISCLAIMER_TEST)).toThrow();
  });

  it('current_delay est null pour un numéro jamais sorti', () => {
    const profile = computeNumberProfile(DRAWS, 13, false, DISCLAIMER_TEST);
    expect(profile.appearances).toBe(0);
    expect(profile.current_delay).toBeNull();
    expect(profile.gap_mean).toBeNull();
  });

  it('last_appearances est trié du plus récent au plus ancien', () => {
    const profile = computeNumberProfile(DRAWS, 1, false, DISCLAIMER_TEST);
    expect(profile.last_appearances).toEqual(['2020-01-08', '2020-01-06', '2020-01-04']);
  });
});
