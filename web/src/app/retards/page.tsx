import type { Metadata } from 'next';

import { api } from '@/lib/api';
import { BarList, Breadcrumbs, Disclaimer, EmptyData, Section } from '@/components/ui';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Retards des numéros du Loto — depuis combien de tirages ?',
  description:
    'Retard actuel de chaque numéro du Loto : nombre de tirages écoulés depuis sa dernière ' +
    'sortie. Rappel important : un retard élevé n’augmente pas la probabilité de sortie.',
  alternates: { canonical: '/retards' },
};

export default async function DelaysPage() {
  const [delays, gaps] = await Promise.all([api.delays(), api.gaps()]);
  const hasData = delays && delays.draw_count > 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Statistiques', href: '/statistiques' }, { label: 'Retards' }]} />
      <h1 className="text-2xl font-bold">Retards des numéros</h1>
      {hasData ? (
        <>
          <p className="max-w-3xl text-sm opacity-80">{delays!.explanation}</p>
          <Section title="Retard actuel par numéro (1-49)">
            <BarList
              items={[...delays!.numbers]
                .filter((stat) => stat.delay !== null && stat.delay !== undefined)
                .sort((a, b) => (b.delay ?? 0) - (a.delay ?? 0))
                .map((stat) => ({
                  label: String(stat.number),
                  value: stat.delay ?? 0,
                  display: `${stat.delay} tirages`,
                  href: `/numero/${stat.number}`,
                }))}
            />
          </Section>
          {gaps ? (
            <Section title="Écarts entre sorties (cycles observés)">
              <p className="mb-3 text-sm opacity-80">{gaps.explanation}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                      <th className="py-2 pr-4">Numéro</th>
                      <th className="py-2 pr-4">Sorties</th>
                      <th className="py-2 pr-4">Écart min</th>
                      <th className="py-2 pr-4">Écart moyen</th>
                      <th className="py-2">Écart max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(gaps.numbers as unknown as {
                      number: number; appearances: number;
                      gap_min: number | null; gap_mean: number | null; gap_max: number | null;
                    }[])
                      .filter((row) => row.appearances > 1)
                      .sort((a, b) => (a.gap_mean ?? 0) - (b.gap_mean ?? 0))
                      .map((row) => (
                        <tr key={row.number} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="py-1.5 pr-4 font-semibold">{row.number}</td>
                          <td className="py-1.5 pr-4">{row.appearances}</td>
                          <td className="py-1.5 pr-4">{row.gap_min ?? '—'}</td>
                          <td className="py-1.5 pr-4">{row.gap_mean ?? '—'}</td>
                          <td className="py-1.5">{row.gap_max ?? '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Section>
          ) : null}
          <Section title="Numéro Chance">
            <BarList
              items={[...delays!.chance]
                .filter((stat) => stat.delay !== null && stat.delay !== undefined)
                .sort((a, b) => (b.delay ?? 0) - (a.delay ?? 0))
                .map((stat) => ({
                  label: String(stat.number),
                  value: stat.delay ?? 0,
                  display: `${stat.delay} tirages`,
                  href: `/numero-chance/${stat.number}`,
                }))}
            />
          </Section>
        </>
      ) : (
        <EmptyData />
      )}
      <Disclaimer />
    </div>
  );
}
