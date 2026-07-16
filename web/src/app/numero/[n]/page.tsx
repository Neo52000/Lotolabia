import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { api } from '@/lib/api';
import { Breadcrumbs, Disclaimer, EmptyData, NumberBall, Section } from '@/components/ui';

export const revalidate = 3600;

export function generateStaticParams() {
  return Array.from({ length: 49 }, (_, index) => ({ n: String(index + 1) }));
}

interface Props {
  params: { n: string };
}

interface Profile {
  draw_count: number;
  appearances: number;
  relative_frequency: number;
  current_delay: number | null;
  gap_mean: number | null;
  gap_min: number | null;
  gap_max: number | null;
  last_appearances: string[];
  top_companions?: { number: number; count: number }[];
  explanation: string;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = Number(params.n);
  const profile = (await api.numberProfile(n)) as Profile | null;
  const empty = !profile || profile.draw_count === 0;
  return {
    title: `Numéro ${params.n} au Loto : fréquence, retard, écarts`,
    description:
      `Statistiques complètes du numéro ${params.n} au Loto : ${profile?.appearances ?? 0} sorties, ` +
      `retard actuel, écarts entre sorties et numéros compagnons, sur l'historique officiel.`,
    alternates: { canonical: `/numero/${params.n}` },
    robots: empty ? { index: false } : undefined,
  };
}

export default async function NumberPage({ params }: Props) {
  const n = Number(params.n);
  if (!Number.isInteger(n) || n < 1 || n > 49) notFound();
  const profile = (await api.numberProfile(n)) as Profile | null;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Statistiques', href: '/statistiques' }, { label: `Numéro ${n}` }]} />
      <div className="flex items-center gap-4">
        <NumberBall n={n} />
        <h1 className="text-2xl font-bold">Le numéro {n} au Loto</h1>
      </div>
      {profile && profile.draw_count > 0 ? (
        <>
          <Section title="Fiche statistique">
            <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <Stat label="Sorties" value={String(profile.appearances)} />
              <Stat label="Fréquence relative" value={`${(profile.relative_frequency * 100).toFixed(1)} %`} />
              <Stat label="Retard actuel" value={profile.current_delay === null ? 'jamais sorti' : `${profile.current_delay} tirages`} />
              <Stat label="Écart moyen" value={profile.gap_mean === null ? '—' : `${profile.gap_mean} tirages`} />
            </dl>
            <p className="mt-4 text-sm opacity-80">
              Sur {profile.draw_count} tirages analysés, le numéro {n} est sorti {profile.appearances} fois,
              soit dans {(profile.relative_frequency * 100).toFixed(1)} % des tirages
              {profile.gap_min !== null &&
                `, avec un écart entre deux sorties allant de ${profile.gap_min} à ${profile.gap_max} tirages`}
              . Ces valeurs décrivent le passé : elles n&apos;indiquent rien sur le prochain tirage.
            </p>
          </Section>
          {profile.last_appearances.length > 0 && (
            <Section title="Dernières sorties">
              <ul className="flex flex-wrap gap-2 text-sm">
                {profile.last_appearances.map((date) => (
                  <li key={date}>
                    <Link href={`/tirage/${date}`} className="rounded-lg border border-slate-200 px-3 py-1 hover:border-primary dark:border-slate-700">
                      {date}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {profile.top_companions && profile.top_companions.length > 0 && (
            <Section title="Numéros compagnons">
              <p className="mb-3 text-sm opacity-80">
                Numéros sortis le plus souvent dans le même tirage que le {n} (cooccurrences).
              </p>
              <ul className="flex flex-wrap gap-3">
                {profile.top_companions.map((companion) => (
                  <li key={companion.number} className="flex items-center gap-2 text-sm">
                    <Link href={`/numero/${companion.number}`}>
                      <NumberBall n={companion.number} size="sm" />
                    </Link>
                    <span className="opacity-70">{companion.count}×</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <nav className="flex justify-between text-sm">
            {n > 1 ? (
              <Link href={`/numero/${n - 1}`} className="text-primary hover:underline">← Numéro {n - 1}</Link>
            ) : <span />}
            {n < 49 ? (
              <Link href={`/numero/${n + 1}`} className="text-primary hover:underline">Numéro {n + 1} →</Link>
            ) : <span />}
          </nav>
        </>
      ) : (
        <EmptyData />
      )}
      <Disclaimer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
      <dt className="text-xs opacity-70">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
