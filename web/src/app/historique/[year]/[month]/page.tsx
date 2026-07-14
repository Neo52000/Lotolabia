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
  params: { year: string; month: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const monthIndex = Number(params.month) - 1;
  const monthLabel = MONTHS[monthIndex] ?? params.month;
  const data = await api.draws(1, 1, Number(params.year), Number(params.month));
  const empty = !data || data.total === 0;
  return {
    title: `Tirages du Loto de ${monthLabel} ${params.year}`,
    description:
      `Résultats des tirages du Loto de ${monthLabel} ${params.year} avec analyse ` +
      'descriptive de chaque tirage : somme, répartitions et profils de numéros.',
    alternates: { canonical: `/historique/${params.year}/${params.month}` },
    robots: empty ? { index: false } : undefined,
  };
}

export default async function MonthPage({ params }: Props) {
  const year = Number(params.year);
  const month = Number(params.month);
  if (!Number.isInteger(year) || year < 1976 || year > 2100) notFound();
  if (!Number.isInteger(month) || month < 1 || month > 12) notFound();

  const data = await api.draws(1, 31, year, month);
  const monthLabel = MONTHS[month - 1];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Historique', href: '/historique' },
          { label: params.year, href: `/historique/${params.year}` },
          { label: monthLabel },
        ]}
      />
      <h1 className="text-2xl font-bold capitalize">
        Tirages du Loto — {monthLabel} {params.year}
      </h1>
      {data && data.total > 0 ? (
        <Section title={`${data.total} tirages ce mois-ci`}>
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
      ) : (
        <EmptyData />
      )}
      <Disclaimer />
    </div>
  );
}
