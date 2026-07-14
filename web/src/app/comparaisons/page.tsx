import type { Metadata } from 'next';

import { api } from '@/lib/api';
import { Breadcrumbs, Disclaimer, EmptyData, Section } from '@/components/ui';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Comparaison des périodes — 20 vs 100 derniers tirages',
  description:
    'Comparaison pédagogique des fréquences de sortie entre les 20 et les 100 derniers ' +
    'tirages du Loto : une illustration des fluctuations normales du hasard.',
  alternates: { canonical: '/comparaisons' },
};

export default async function ComparisonsPage() {
  const [recent, longer] = await Promise.all([api.frequencies(20), api.frequencies(100)]);
  const hasData = recent && longer && longer.draw_count > 0;

  const rows = hasData
    ? recent!.numbers
        .map((stat) => {
          const other = longer!.numbers.find((item) => item.number === stat.number);
          const relativeRecent = (stat.relative ?? 0) * 100;
          const relativeLonger = (other?.relative ?? 0) * 100;
          return {
            number: stat.number,
            recent: relativeRecent,
            longer: relativeLonger,
            delta: relativeRecent - relativeLonger,
          };
        })
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 20)
    : [];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Statistiques', href: '/statistiques' }, { label: 'Comparaisons' }]} />
      <h1 className="text-2xl font-bold">Comparer les périodes d&apos;analyse</h1>
      <p className="max-w-3xl text-sm opacity-80">
        Sur une courte période, certains numéros semblent « chauds » ou « froids ». En allongeant
        la fenêtre d&apos;analyse, ces écarts se resserrent : c&apos;est la loi des grands nombres.
        Ce tableau compare la fréquence relative de chaque numéro sur les 20 et les 100 derniers
        tirages — les plus gros écarts d&apos;abord.
      </p>
      {hasData ? (
        <Section title="Écarts de fréquence relative (20 vs 100 derniers tirages)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                  <th className="py-2 pr-4">Numéro</th>
                  <th className="py-2 pr-4">20 derniers</th>
                  <th className="py-2 pr-4">100 derniers</th>
                  <th className="py-2">Écart</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.number} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-4 font-semibold">{row.number}</td>
                    <td className="py-1.5 pr-4">{row.recent.toFixed(1)} %</td>
                    <td className="py-1.5 pr-4">{row.longer.toFixed(1)} %</td>
                    <td className={`py-1.5 font-semibold ${row.delta > 0 ? 'text-brand-green' : 'text-brand-pink'}`}>
                      {row.delta > 0 ? '+' : ''}{row.delta.toFixed(1)} pt
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm opacity-80">
            Ces écarts sont des fluctuations statistiques normales d&apos;un processus aléatoire,
            pas des signaux exploitables.
          </p>
        </Section>
      ) : (
        <EmptyData />
      )}
      <Disclaimer />
    </div>
  );
}
