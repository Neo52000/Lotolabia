import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { api, DISCLAIMER, formatDateFr, SITE_URL } from '@/lib/api';
import { Breadcrumbs, Disclaimer, DrawBalls, DrawFacts, Section } from '@/components/ui';

export const revalidate = 86400;

interface Props {
  params: { date: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const draw = await api.drawByDate(params.date);
  if (!draw) return { robots: { index: false } };
  const label = formatDateFr(draw.draw_date);
  return {
    title: `Tirage du Loto du ${label} : ${draw.numbers.join('-')} + Chance ${draw.chance}`,
    description:
      `Résultat officiel du tirage du Loto du ${label} : numéros ${draw.numbers.join(', ')} ` +
      `et numéro Chance ${draw.chance}. Analyse descriptive : somme, répartition, profils des numéros.`,
    alternates: { canonical: `/tirage/${draw.draw_date}` },
  };
}

export default async function DrawPage({ params }: Props) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date)) notFound();
  const draw = await api.drawByDate(params.date);
  if (!draw) notFound();

  const label = formatDateFr(draw.draw_date);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `Tirage du Loto du ${label}`,
    description: `Numéros : ${draw.numbers.join(', ')} — Chance : ${draw.chance}. ${DISCLAIMER}`,
    url: `${SITE_URL}/tirage/${draw.draw_date}`,
    temporalCoverage: draw.draw_date,
    creator: { '@type': 'Organization', name: 'LotoLab IA' },
    isBasedOn: 'Résultats officiels publiés par l’opérateur du Loto',
  };

  return (
    <div className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[{ label: 'Historique', href: '/historique' }, { label }]} />
      <h1 className="text-2xl font-bold">Tirage du Loto du {label}</h1>
      <Section title="Combinaison tirée">
        <div className="space-y-4">
          <DrawBalls draw={draw} />
          <DrawFacts numbers={draw.numbers} />
          <p className="text-xs opacity-60">
            Source : {draw.source === 'manual' ? 'import contrôlé' : 'collecte automatique officielle'} —
            mise à jour continue.
          </p>
        </div>
      </Section>
      <Section title="Explorer les numéros de ce tirage">
        <p className="mb-3 text-sm opacity-80">
          Chaque numéro a sa fiche : fréquence historique, retard actuel, écarts moyens et
          compagnons de tirage.
        </p>
        <ul className="flex flex-wrap gap-2">
          {draw.numbers.map((n) => (
            <li key={n}>
              <Link href={`/numero/${n}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:border-primary dark:border-slate-700">
                Numéro {n} →
              </Link>
            </li>
          ))}
          <li>
            <Link href={`/numero-chance/${draw.chance}`} className="rounded-lg border border-accent/50 px-3 py-1.5 text-sm hover:border-accent">
              Chance {draw.chance} →
            </Link>
          </li>
        </ul>
      </Section>
      <Disclaimer />
    </div>
  );
}
