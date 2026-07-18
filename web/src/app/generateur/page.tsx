import type { Metadata } from 'next';

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
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="mb-2.5 font-sora text-3xl font-extrabold tracking-tight sm:text-4xl">Générateur de grilles</h1>
      <p className="mb-10 text-lg text-[#495064] dark:text-slate-300">
        Choisis une méthode statistique, génère une grille expérimentale.
      </p>

      <GeneratorClient />

      <p className="mx-auto mt-8 max-w-xl text-xs leading-relaxed text-[#8A93A6]">
        ⚠ Toute grille valide conserve la même probabilité théorique de gain, quelle que soit la
        méthode utilisée. LotoLab IA n&apos;est affilié ni à la FDJ ni à aucun opérateur de jeux.
        Jeu interdit aux mineurs — 18+.
      </p>

      <div className="mt-14 rounded-2xl border border-night/[0.08] bg-white p-6 text-left text-sm shadow-[0_6px_24px_rgba(13,27,42,0.05)] dark:border-white/10 dark:bg-slate-900">
        <h2 className="mb-4 font-sora text-lg font-bold">Comment fonctionnent les méthodes ?</h2>
        <div className="space-y-3 opacity-90">
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
      </div>
    </div>
  );
}
