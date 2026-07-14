import type { Metadata } from 'next';
import Link from 'next/link';

import { api } from '@/lib/api';
import { BarList, Breadcrumbs, Disclaimer, EmptyData, Section, topByCount } from '@/components/ui';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Statistiques du Loto — fréquences, retards, paires, tendances',
  description:
    'Toutes les statistiques descriptives du Loto calculées sur l’historique officiel : ' +
    'fréquences, retards, écarts, paires, sommes, répartitions pairs/impairs et dizaines.',
  alternates: { canonical: '/statistiques' },
};

const TOPICS = [
  { href: '/frequences', title: 'Fréquences', text: 'Combien de fois chaque numéro est sorti, en absolu et en relatif.' },
  { href: '/retards', title: 'Retards', text: 'Depuis combien de tirages chaque numéro n’est pas sorti.' },
  { href: '/comparaisons', title: 'Comparaisons', text: 'Fréquences comparées entre 20 et 100 derniers tirages.' },
  { href: '/simulations', title: 'Simulations', text: 'Monte-Carlo pédagogique et confrontation d’une grille à l’historique.' },
];

export default async function StatsHubPage() {
  const [frequencies, shapes, pairs] = await Promise.all([
    api.frequencies(),
    api.shapes(),
    api.pairs(10),
  ]);
  const hasData = frequencies && frequencies.draw_count > 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Statistiques' }]} />
      <h1 className="text-2xl font-bold">Statistiques du Loto</h1>
      <p className="max-w-3xl text-sm opacity-80">
        Toutes les analyses sont descriptives : elles racontent le passé, jamais l&apos;avenir.
        Chaque page explique sa méthode de calcul — voir aussi la{' '}
        <Link href="/methodologie" className="text-brand hover:underline">méthodologie complète</Link>.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {TOPICS.map((topic) => (
          <Link key={topic.href} href={topic.href} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand dark:border-slate-700 dark:bg-slate-900">
            <h2 className="font-semibold">{topic.title}</h2>
            <p className="mt-1 text-sm opacity-80">{topic.text}</p>
          </Link>
        ))}
      </div>

      {hasData ? (
        <>
          <Section title="Aperçu : numéros les plus sortis">
            <BarList
              items={topByCount(frequencies!.numbers, 8).map((stat) => ({
                label: String(stat.number),
                value: stat.count ?? 0,
                display: `${stat.count}×`,
                href: `/numero/${stat.number}`,
              }))}
            />
          </Section>
          {pairs ? (
            <Section title="Paires sorties le plus souvent ensemble">
              <ul className="grid gap-2 text-sm md:grid-cols-2">
                {((pairs.combinations as { numbers: number[]; count: number }[]) ?? []).map((combo) => (
                  <li key={combo.numbers.join('-')} className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
                    <span>
                      <Link href={`/numero/${combo.numbers[0]}`} className="font-semibold text-brand hover:underline">{combo.numbers[0]}</Link>
                      {' et '}
                      <Link href={`/numero/${combo.numbers[1]}`} className="font-semibold text-brand hover:underline">{combo.numbers[1]}</Link>
                    </span>
                    <span className="opacity-70">{combo.count}× ensemble</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {shapes && (shapes.sum as { mean?: number })?.mean ? (
            <Section title="Formes de tirage">
              <p className="text-sm">
                Somme moyenne des cinq numéros : <strong>{String((shapes.sum as { mean: number }).mean)}</strong>{' '}
                (min {String((shapes.sum as { min: number }).min)}, max {String((shapes.sum as { max: number }).max)},
                médiane {String((shapes.sum as { median: number }).median)}, écart-type {String((shapes.sum as { std_dev: number }).std_dev)}).
                Amplitude moyenne : <strong>{String((shapes.amplitude as { mean: number }).mean)}</strong>.
              </p>
            </Section>
          ) : null}
        </>
      ) : (
        <EmptyData />
      )}
      <Disclaimer />
    </div>
  );
}
