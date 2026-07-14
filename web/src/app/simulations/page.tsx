import type { Metadata } from 'next';

import { Breadcrumbs, Disclaimer, Section } from '@/components/ui';

import SimulationClient from './SimulationClient';

export const metadata: Metadata = {
  title: 'Simulations Monte-Carlo du Loto',
  description:
    'Simulez des milliers de grilles de Loto aléatoires pour visualiser les probabilités ' +
    'réelles du jeu : une démonstration pédagogique et transparente.',
  alternates: { canonical: '/simulations' },
};

export default function SimulationsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Simulations' }]} />
      <h1 className="text-2xl font-bold">Simulations Monte-Carlo</h1>
      <p className="max-w-3xl text-sm opacity-80">
        La méthode Monte-Carlo consiste à répéter une expérience aléatoire un grand nombre de fois
        pour observer la distribution des résultats. Ici : générer des grilles au hasard et les
        confronter à des tirages au hasard. Le résultat illustre les probabilités théoriques —
        il ne les modifie pas.
      </p>
      <Section title="Expérience en direct">
        <SimulationClient />
      </Section>
      <Section title="Les probabilités exactes">
        <div className="space-y-2 text-sm opacity-90">
          <p>Au Loto, une grille simple comporte 5 numéros parmi 49 et 1 numéro Chance parmi 10.</p>
          <p>
            Nombre de combinaisons : C(49,5) × 10 = 1 906 884 × 10 = <strong>19 068 840</strong>.
            La probabilité de remporter le rang 1 est donc de 1 sur 19 068 840 — pour chaque
            grille, à chaque tirage, quelle que soit la combinaison choisie.
          </p>
          <p>
            L&apos;application mobile permet en plus de confronter votre propre grille à
            l&apos;historique réel des tirages.
          </p>
        </div>
      </Section>
      <Disclaimer />
    </div>
  );
}
