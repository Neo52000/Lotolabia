import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { api } from '@/lib/api';
import { Breadcrumbs, Disclaimer, EmptyData, NumberBall, Section } from '@/components/ui';

export const revalidate = 3600;

export function generateStaticParams() {
  return Array.from({ length: 10 }, (_, index) => ({ n: String(index + 1) }));
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
  last_appearances: string[];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = (await api.numberProfile(Number(params.n), true)) as Profile | null;
  const empty = !profile || profile.draw_count === 0;
  return {
    title: `Numéro Chance ${params.n} : fréquence et retard`,
    description:
      `Statistiques du numéro Chance ${params.n} au Loto : nombre de sorties, fréquence ` +
      'relative et retard actuel sur l’historique officiel des tirages.',
    alternates: { canonical: `/numero-chance/${params.n}` },
    robots: empty ? { index: false } : undefined,
  };
}

export default async function ChancePage({ params }: Props) {
  const n = Number(params.n);
  if (!Number.isInteger(n) || n < 1 || n > 10) notFound();
  const profile = (await api.numberProfile(n, true)) as Profile | null;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Statistiques', href: '/statistiques' }, { label: `Chance ${n}` }]} />
      <div className="flex items-center gap-4">
        <NumberBall n={n} chance />
        <h1 className="text-2xl font-bold">Le numéro Chance {n}</h1>
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
              La probabilité théorique de chaque numéro Chance est identique (1 sur 10) à chaque
              tirage, quelle que soit la fréquence observée dans le passé.
            </p>
          </Section>
          {profile.last_appearances.length > 0 && (
            <Section title="Dernières sorties">
              <ul className="flex flex-wrap gap-2 text-sm">
                {profile.last_appearances.map((date) => (
                  <li key={date}>
                    <Link href={`/tirage/${date}`} className="rounded-lg border border-slate-200 px-3 py-1 hover:border-brand dark:border-slate-700">
                      {date}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <nav className="flex justify-between text-sm">
            {n > 1 ? (
              <Link href={`/numero-chance/${n - 1}`} className="text-brand hover:underline">← Chance {n - 1}</Link>
            ) : <span />}
            {n < 10 ? (
              <Link href={`/numero-chance/${n + 1}`} className="text-brand hover:underline">Chance {n + 1} →</Link>
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
