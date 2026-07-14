import type { Metadata } from 'next';
import Link from 'next/link';

import { api, formatDateFr } from '@/lib/api';
import { Breadcrumbs, Disclaimer, DrawBalls, DrawFacts, EmptyData, Section } from '@/components/ui';

export const revalidate = 900;

export const metadata: Metadata = {
  title: 'Dernier résultat du Loto — numéros et analyse',
  description:
    'Le dernier tirage du Loto avec analyse descriptive immédiate : somme, répartition ' +
    'pairs/impairs, dizaines et liens vers les statistiques de chaque numéro.',
  alternates: { canonical: '/resultats' },
};

export default async function ResultsPage() {
  const [latest, page] = await Promise.all([api.latestDraw(), api.draws(1, 10)]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Dernier résultat' }]} />
      <h1 className="text-2xl font-bold">Dernier résultat du Loto</h1>
      {latest ? (
        <>
          <Section title={formatDateFr(latest.draw_date)}>
            <div className="space-y-4">
              <DrawBalls draw={latest} />
              <DrawFacts numbers={latest.numbers} />
              <Link href={`/tirage/${latest.draw_date}`} className="inline-block text-sm text-brand hover:underline">
                Page complète de ce tirage →
              </Link>
            </div>
          </Section>
          <Section title="Tirages précédents">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {(page?.items ?? []).slice(1).map((draw) => (
                <li key={draw.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <Link href={`/tirage/${draw.draw_date}`} className="text-sm hover:underline">
                    {formatDateFr(draw.draw_date)}
                  </Link>
                  <DrawBalls draw={draw} size="sm" />
                </li>
              ))}
            </ul>
            <Link href="/historique" className="mt-4 inline-block text-sm text-brand hover:underline">
              Tout l&apos;historique →
            </Link>
          </Section>
        </>
      ) : (
        <EmptyData />
      )}
      <Disclaimer />
    </div>
  );
}

