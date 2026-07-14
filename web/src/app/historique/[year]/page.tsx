import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { api, formatDateFr } from '@/lib/api';
import { Breadcrumbs, Disclaimer, DrawBalls, EmptyData, Section } from '@/components/ui';

export const revalidate = 3600;

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

interface Props {
  params: { year: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const year = Number(params.year);
  const data = await api.draws(1, 1, year);
  const empty = !data || data.total === 0;
  return {
    title: `Tirages du Loto ${params.year} — historique et statistiques`,
    description:
      `Tous les tirages du Loto de l'année ${params.year} : ${data?.total ?? 0} tirages, ` +
      'navigation par mois et analyse de chaque tirage.',
    alternates: { canonical: `/historique/${params.year}` },
    robots: empty ? { index: false } : undefined,
  };
}

export default async function YearPage({ params }: Props) {
  const year = Number(params.year);
  if (!Number.isInteger(year) || year < 1976 || year > 2100) notFound();
  const data = await api.draws(1, 100, year);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Historique', href: '/historique' }, { label: params.year }]} />
      <h1 className="text-2xl font-bold">Tirages du Loto en {params.year}</h1>
      {data && data.total > 0 ? (
        <>
          <p className="text-sm opacity-80">
            {data.total} tirages enregistrés pour {params.year}.
          </p>
          <Section title="Par mois">
            <ul className="flex flex-wrap gap-2 text-sm">
              {MONTHS.map((month, index) => (
                <li key={month}>
                  <Link
                    href={`/historique/${params.year}/${String(index + 1).padStart(2, '0')}`}
                    className="rounded-lg border border-slate-200 px-3 py-1 capitalize hover:border-brand dark:border-slate-700"
                  >
                    {month}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Tirages de l'année">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.items.map((draw) => (
                <li key={draw.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <Link href={`/tirage/${draw.draw_date}`} className="text-sm hover:underline">
                    {formatDateFr(draw.draw_date)}
                  </Link>
                  <DrawBalls draw={draw} size="sm" />
                </li>
              ))}
            </ul>
          </Section>
        </>
      ) : (
        <EmptyData />
      )}
      <Disclaimer />
    </div>
  );
}
