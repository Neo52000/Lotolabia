import type { Metadata } from 'next';

import { Breadcrumbs, Disclaimer, Section } from '@/components/ui';

import GeneratorClient from './GeneratorClient';

export const metadata: Metadata = {
  title: 'Générateur de grilles expérimental',
  description:
    'Générez des grilles de Loto avec six méthodes expérimentales transparentes (aléatoire, ' +
    'fréquence, retard, équilibrage, contrôle de somme, diversification). Aucune méthode ne ' +
    'modifie la probabilité théorique de gain.',
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
            <strong>Pondération par fréquence / par retard</strong> : les numéros les plus sortis
            (ou les plus « en retard ») dans l&apos;historique ont plus de chances d&apos;être choisis{' '}
            <em>dans la grille générée</em>. Cela ne change rien à leur probabilité de sortir au
            prochain tirage — c&apos;est une expérience statistique, pas une stratégie.
          </p>
          <p>
            <strong>Équilibrage pair/impair et bas/haut</strong> : la grille générée respecte la
            répartition la plus fréquemment observée (2 à 3 numéros pairs, 2 à 3 numéros ≤ 24).
          </p>
          <p>
            <strong>Contrôle de la somme</strong> : la somme des 5 numéros est contrainte dans une
            fourchette choisie (100 à 150 par défaut, la zone où se concentre la majorité des
            combinaisons possibles).
          </p>
          <p>
            <strong>Diversification</strong> : en générant plusieurs grilles d&apos;un coup, chacune
            partage au maximum 2 numéros avec les précédentes du même lot.
          </p>
          <p>
            L&apos;application mobile propose en plus les exclusions et favoris personnalisés, ainsi
            que la sauvegarde des grilles sur votre compte.
          </p>
        </div>
      </Section>
    </div>
  );
}
