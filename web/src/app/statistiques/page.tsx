import type { Metadata } from 'next';
import Link from 'next/link';

import { api } from '@/lib/api';
import { EmptyData, topByDelay } from '@/components/ui';

import StatsHeatGrid from './StatsHeatGrid';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Statistiques du Loto — fréquences, retards, paires, tendances',
  description:
    'Toutes les statistiques descriptives du Loto calculées sur l’historique officiel : ' +
    'fréquences, retards, écarts, paires, sommes, répartitions pairs/impairs et dizaines.',
  alternates: { canonical: '/statistiques' },
};

const MONTE_CARLO_ANONYMOUS_ITERATIONS = 1_000;

const TOPICS = [
  { href: '/frequences', title: 'Fréquences', text: 'Combien de fois chaque numéro est sorti, en absolu et en relatif.' },
  { href: '/retards', title: 'Retards', text: 'Depuis combien de tirages chaque numéro n’est pas sorti.' },
  { href: '/comparaisons', title: 'Comparaisons', text: 'Fréquences comparées entre 20 et 100 derniers tirages.' },
  { href: '/simulations', title: 'Simulations', text: 'Monte-Carlo pédagogique et confrontation d’une grille à l’historique.' },
];

export default async function StatsHubPage() {
  const [freq50, freq100, freq500, delays, pairs] = await Promise.all([
    api.frequencies(50),
    api.frequencies(100),
    api.frequencies(500),
    api.delays(),
    api.pairs(4),
  ]);
  const hasData = Boolean(freq100 && freq100.draw_count > 0);
  const delayed = hasData && delays ? topByDelay(delays.numbers, 4) : [];
  const pairCombos = ((pairs?.combinations as { numbers: number[]; count: number }[] | undefined) ?? []).slice(0, 4);
  const drawCount = freq500?.draw_count ?? freq100?.draw_count ?? 0;

  return (
    <div>
      {hasData ? (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-[13px] font-semibold text-[#8A6200]">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-green shadow-[0_0_8px_#22C55E]" />
          {drawCount.toLocaleString('fr-FR')} tirages officiels analysés
        </div>
      ) : null}
      <h1 className="mb-2.5 font-sora text-3xl font-extrabold tracking-tight sm:text-4xl">Statistiques</h1>
      <p className="mb-8 max-w-2xl text-lg text-[#495064] dark:text-slate-300">
        L&apos;historique officiel décortiqué, sans filtre — à toi d&apos;en tirer tes propres
        conclusions. Voir aussi la{' '}
        <Link href="/methodologie" className="text-gold hover:underline">méthodologie complète</Link>.
      </p>

      {hasData ? (
        <>
          <StatsHeatGrid
            datasets={{ '50': freq50?.numbers ?? [], '100': freq100?.numbers ?? [], '500': freq500?.numbers ?? [] }}
          />

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-night/[0.08] bg-white p-6 shadow-[0_6px_24px_rgba(13,27,42,0.05)] dark:border-white/10 dark:bg-slate-900">
              <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-violet">Numéros en retard</div>
              {delayed.length > 0 ? (
                <div className="flex flex-col gap-2.5 text-sm">
                  {delayed.map((s) => (
                    <div key={s.number} className="flex justify-between">
                      <span>N°{s.number}</span>
                      <span className="font-semibold text-brand-violet">{s.delay} tirages</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6B7280] dark:text-slate-400">Données en cours de collecte.</p>
              )}
            </div>

            <div className="rounded-2xl border border-night/[0.08] bg-white p-6 shadow-[0_6px_24px_rgba(13,27,42,0.05)] dark:border-white/10 dark:bg-slate-900">
              <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-pink">Paires fréquentes</div>
              {pairCombos.length > 0 ? (
                <div className="flex flex-col gap-2.5 text-sm">
                  {pairCombos.map((combo) => (
                    <div key={combo.numbers.join('-')} className="flex justify-between">
                      <span>{combo.numbers.join(' – ')}</span>
                      <span className="font-semibold text-brand-pink">{combo.count} fois</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6B7280] dark:text-slate-400">Données en cours de collecte.</p>
              )}
            </div>

            <div className="rounded-2xl border border-brand-green/25 bg-gradient-to-b from-brand-green/10 to-white p-6 shadow-[0_6px_24px_rgba(13,27,42,0.05)] dark:from-brand-green/10 dark:to-slate-900">
              <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-green">Simulation Monte-Carlo</div>
              <div className="mb-2 font-sora text-2xl font-extrabold text-brand-green">
                {MONTE_CARLO_ANONYMOUS_ITERATIONS.toLocaleString('fr-FR')} tirages simulés
              </div>
              <p className="text-sm text-[#6B7280] dark:text-slate-400">
                Comparaison de la distribution réelle à un tirage purement aléatoire — voir la{' '}
                <Link href="/simulations" className="text-brand-green hover:underline">simulation en direct</Link>.
              </p>
            </div>
          </div>

          <p className="mt-8 max-w-3xl text-xs leading-relaxed text-[#8A93A6]">
            ⚠ Les statistiques décrivent le passé et ne permettent pas de prévoir les tirages
            futurs. Toute grille valide conserve la même probabilité théorique de gain.
          </p>
        </>
      ) : (
        <EmptyData />
      )}

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {TOPICS.map((topic) => (
          <Link
            key={topic.href}
            href={topic.href}
            className="rounded-2xl border border-night/[0.08] bg-white p-5 transition hover:border-gold/50 dark:border-white/10 dark:bg-slate-900"
          >
            <h2 className="font-sora font-semibold">{topic.title}</h2>
            <p className="mt-1 text-sm text-[#6B7280] dark:text-slate-400">{topic.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
