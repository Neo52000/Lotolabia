import type { Metadata } from 'next';

import { Breadcrumbs, Disclaimer, Section } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Probabilités du Loto : les vrais chiffres',
  description:
    'Probabilité exacte de gagner au Loto par rang de gain, espérance mathématique et ' +
    'idées reçues démontées : les chiffres réels, expliqués simplement.',
  alternates: { canonical: '/probabilites' },
};

const RANKS = [
  { rank: '5 numéros + Chance', odds: '1 sur 19 068 840' },
  { rank: '5 numéros', odds: '1 sur 2 118 760' },
  { rank: '4 numéros + Chance', odds: '1 sur 86 677' },
  { rank: '4 numéros', odds: '1 sur 9 631' },
  { rank: '3 numéros + Chance', odds: '1 sur 2 016' },
  { rank: '3 numéros', odds: '1 sur 224' },
  { rank: '2 numéros + Chance', odds: '1 sur 144' },
  { rank: '2 numéros', odds: '1 sur 16' },
  { rank: 'Numéro Chance seul', odds: '1 sur 18 (environ)' },
];

export default function ProbabilitiesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Probabilités' }]} />
      <h1 className="text-2xl font-bold">Les probabilités réelles du Loto</h1>

      <Section title="Par rang de gain">
        <p className="mb-4 text-sm opacity-80">
          Une grille simple = 5 numéros parmi 49 + 1 numéro Chance parmi 10, soit
          19 068 840 combinaisons possibles. Probabilités approchées par rang :
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                <th className="py-2 pr-4">Rang</th>
                <th className="py-2">Probabilité</th>
              </tr>
            </thead>
            <tbody>
              {RANKS.map((row) => (
                <tr key={row.rank} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-4">{row.rank}</td>
                  <td className="py-1.5 font-semibold tabular-nums">{row.odds}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs opacity-70">
          Valeurs indicatives calculées à partir des règles publiques du jeu ; se référer au
          règlement officiel pour les montants et conditions de gain.
        </p>
      </Section>

      <Section title="Pour se représenter 1 sur 19 068 840">
        <ul className="list-disc space-y-1 pl-5 text-sm opacity-90">
          <li>C&apos;est environ deux fois moins probable que de lancer 24 fois « pile » d&apos;affilée avec une pièce équilibrée.</li>
          <li>En jouant une grille à chacun des 156 tirages annuels, il faudrait en moyenne plus de 120 000 ans pour décrocher le rang 1.</li>
          <li>Chaque combinaison — y compris 1-2-3-4-5 — a exactement la même probabilité.</li>
        </ul>
      </Section>

      <Section title="Idées reçues">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-semibold">« Ce numéro n&apos;est pas sorti depuis longtemps, il va sortir. »</dt>
            <dd className="opacity-80">Faux : les tirages sont indépendants. C&apos;est le sophisme du joueur.</dd>
          </div>
          <div>
            <dt className="font-semibold">« Une combinaison équilibrée a plus de chances. »</dt>
            <dd className="opacity-80">Faux : toutes les combinaisons sont équiprobables. Une combinaison atypique peut en revanche réduire le risque de partager le gain avec d&apos;autres joueurs.</dd>
          </div>
          <div>
            <dt className="font-semibold">« Un algorithme peut prédire le prochain tirage. »</dt>
            <dd className="opacity-80">Faux : un tirage équiprobable est imprévisible par construction. Toute promesse contraire est trompeuse.</dd>
          </div>
        </dl>
      </Section>
      <Disclaimer />
    </div>
  );
}
