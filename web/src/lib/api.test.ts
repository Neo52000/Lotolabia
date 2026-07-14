import { describe, expect, it } from 'vitest';

import { DISCLAIMER, formatDateFr, INDEPENDENCE } from './api';

describe('formatDateFr', () => {
  it('formate une date ISO en français', () => {
    const label = formatDateFr('2026-07-11');
    expect(label).toContain('11');
    expect(label).toContain('juillet');
    expect(label).toContain('2026');
  });
});

describe('avertissements obligatoires', () => {
  it('contient la mention de probabilité inchangée', () => {
    expect(DISCLAIMER).toContain('probabilité théorique');
  });

  it('mentionne l’indépendance vis-à-vis de la FDJ', () => {
    expect(INDEPENDENCE).toContain('indépendant');
    expect(INDEPENDENCE).toContain('FDJ');
  });

  it('n’utilise aucun vocabulaire interdit', () => {
    for (const text of [DISCLAIMER, INDEPENDENCE]) {
      expect(text.toLowerCase()).not.toContain('gagnant');
      expect(text.toLowerCase()).not.toContain('garantie');
      expect(text.toLowerCase()).not.toContain('prédiction fiable');
    }
  });
});
