import type { Metadata } from 'next';
import Link from 'next/link';

import { api, formatDateFr } from '@/lib/api';
import { Breadcrumbs, Disclaimer, DrawBalls, EmptyData, Section } from '@/components/ui';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Historique des tirages du Loto',
  description:
    'Historique complet des tirages du Loto, paginé et navigable par année et par mois, ' +
    'avec lien vers l’analyse détaillée de chaque tirage.',
  alternates: { canonical: '/historique' },
};

interface Props {
  searchParams: { page?: string };
}

export default async function HistoryPage({ searchParams }: Props) {
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const data = await api.draws(page, 25);
  const years =
    data && data.items.length > 0
      ? Array.from(
          new Set([
            ...Array.from(
              { length: new Date().getFullYear() - 2019 + 1 },
              (_, index) => 2019 + index,
            ),
          ]),
        ).reverse()
      : [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Historique' }]} />
      <h1 className="text-2xl font-bold">Historique des tirages du Loto</h1>
      {data && data.items.length > 0 ? (
        <>
          <Section title="Parcourir par année">
            <ul className="flex flex-wrap gap-2 text-sm">
              {years.map((year) => (
                <li key={year}>
                  <Link href={`/historique/${year}`} className="rounded-lg border border-slate-200 px-3 py-1 hover:border-brand dark:border-slate-700">
                    {year}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
          <Section title={`Tirages (page ${page} sur ${totalPages})`}>
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
            <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
              {page > 1 ? (
                <Link href={`/historique?page=${page - 1}`} rel="prev" className="text-brand hover:underline">
                  ← Tirages plus récents
                </Link>
              ) : (
                <span />
              )}
              {page < totalPages ? (
                <Link href={`/historique?page=${page + 1}`} rel="next" className="text-brand hover:underline">
                  Tirages plus anciens →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          </Section>
        </>
      ) : (
        <EmptyData />
      )}
      <Disclaimer />
    </div>
  );
}
