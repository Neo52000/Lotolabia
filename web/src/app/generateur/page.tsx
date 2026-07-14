import type { Metadata } from 'next';

import { Breadcrumbs, Disclaimer, Section } from '@/components/ui';

import GeneratorClient from './GeneratorClient';

export const metadata: Metadata = {
  title: 'Générateur de grilles expérimental',
  description:
    'Générez des grilles de Loto avec des méthodes expérimentales transparentes (aléatoire, ' +
    'pondération par fréquence). Aucune méthode ne modifie la probabilité théorique de gain.',
  alternates: { canonical: '/generateur' },
};

export default function GeneratorPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Générateur' }]} />
      <h1 className="text-2xl font-bold">Générateur de grilles expérimental</h1>
      <Disclaimer />
      <Section title="Générer">
        <GeneratorClient />
      </Section>
      <Section title="Comment fonctionnent les méthodes ?">
        <div className="space-y-3 text-sm opacity-90">
          <p>
            <strong>Aléatoire pur</strong> : cinq numéros distincts entre 1 et 49 et un numéro
            Chance entre 1 et 10, tirés uniformément — exactement comme un tirage réel.
          </p>
          <p>
            <strong>Pondération par fréquence</strong> : les numéros les plus sortis dans
            l&apos;historique ont plus de chances d&apos;être choisis <em>dans la grille générée</em>.
            Cela ne change rien à leur probabilité de sortir au prochain tirage — c&apos;est une
            expérience statistique, pas une stratégie.
          </p>
          <p>
            L&apos;application mobile propose des méthodes supplémentaires (pondération par retard,
            équilibrages, contrôle de somme, diversification, exclusions et favoris) ainsi que la
            sauvegarde des grilles.
          </p>
        </div>
      </Section>
    </div>
  );
}
