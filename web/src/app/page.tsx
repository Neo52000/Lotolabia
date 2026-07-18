import type { Metadata } from 'next';
import Link from 'next/link';

import { api } from '@/lib/api';
import { topByCount, topByDelay } from '@/components/ui';

import HeroVisual from './HeroVisual';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'LotoLab IA — Analyse statistique indépendante du Loto',
  description:
    'Dernier tirage du Loto, fréquences, retards et tendances sur l’historique officiel. ' +
    'Un laboratoire statistique transparent et pédagogique — sans fausse promesse.',
  alternates: { canonical: '/' },
};

const GENERATOR_METHOD_COUNT = 6;
const MONTE_CARLO_ANONYMOUS_ITERATIONS = 1_000;
const MONTE_CARLO_PREMIUM_ITERATIONS = 250_000;

const STEPS = [
  {
    title: 'Historique officiel importé',
    text: 'Le collecteur récupère et vérifie chaque tirage officiel automatiquement, sans intervention manuelle.',
  },
  {
    title: 'Analyse statistique poussée',
    text: 'Fréquences, écarts, paires, tendances et simulations Monte-Carlo, expliqués simplement.',
  },
  {
    title: 'Ta grille en un clic',
    text: 'Génère une grille expérimentale à partir de la méthode de ton choix, avec explication à l’appui.',
  },
];

export default async function HomePage() {
  const [frequencies, delays, pairs] = await Promise.all([api.frequencies(), api.delays(), api.pairs(3)]);
  const hasData = Boolean(frequencies && frequencies.draw_count > 0);

  const hottest = hasData ? topByCount(frequencies!.numbers, 5) : [];
  const delayed = hasData && delays ? topByDelay(delays.numbers, 3) : [];
  const pairCombos = ((pairs?.combinations as { numbers: number[]; count: number }[] | undefined) ?? []).slice(0, 3);
  const maxHot = Math.max(1, ...hottest.map((s) => s.count ?? 0));
  const drawCount = frequencies?.draw_count ?? 0;
  const heroNumbers = hottest.length > 0 ? hottest.map((s) => s.number) : [7, 17, 23, 34, 41];

  return (
    <div className="-mx-4 -my-8 sm:-mx-6">
      {/* HERO */}
      <section className="grid gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10 lg:px-14 lg:pb-24 lg:pt-20">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-[13px] font-semibold text-[#8A6200]">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-green shadow-[0_0_8px_#22C55E]" />
            Laboratoire statistique indépendant · 100% data
          </div>
          <h1 className="mb-5 font-sora text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[64px]">
            Analysez. Comprenez.
            <br />
            <span className="animate-shimmer bg-gradient-to-r from-gold via-brand-pink to-brand-violet bg-[length:200%_auto] bg-clip-text text-transparent">
              Jouez mieux.
            </span>
          </h1>
          <p className="mb-9 max-w-lg text-lg leading-relaxed text-[#495064] dark:text-slate-300">
            Fréquences, retards, paires chaudes, simulations Monte-Carlo : toute la puissance des
            statistiques appliquée à l&apos;historique officiel des tirages, dans un tableau de
            bord qui donne envie de creuser.
          </p>
          <div className="mb-7 flex flex-wrap gap-4">
            <Link
              href="/generateur"
              className="rounded-2xl bg-gradient-to-br from-gold-light via-gold to-gold-dark px-7 py-4 font-sora text-base font-bold text-night shadow-[0_8px_30px_rgba(244,196,48,0.45)] transition hover:brightness-105"
            >
              Générer ma grille
            </Link>
            <Link
              href="/statistiques"
              className="rounded-2xl border border-night/15 bg-night/[0.03] px-7 py-4 font-sora text-base font-bold text-night dark:border-white/20 dark:bg-white/5 dark:text-white"
            >
              Voir les statistiques
            </Link>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-[#7C8598]">
            ⚠ Les tirages sont aléatoires. Les statistiques passées ne permettent pas de prévoir
            avec certitude les résultats futurs. LotoLab IA n&apos;est affilié ni à la FDJ ni à
            aucun opérateur de jeux. Jeu interdit aux mineurs — 18+.
          </p>
        </div>

        <HeroVisual numbers={heroNumbers} drawCount={drawCount} methodCount={GENERATOR_METHOD_COUNT} />
      </section>

      {/* HOW IT WORKS */}
      <section className="px-4 py-16 sm:px-6 lg:px-14 lg:py-20">
        <h2 className="mb-3 text-center font-sora text-2xl font-bold sm:text-[34px]">Comment ça marche</h2>
        <p className="mb-12 text-center text-[#6B7280]">Trois étapes, zéro promesse en l&apos;air.</p>
        <div className="grid gap-7 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="rounded-[20px] border border-night/[0.08] bg-white p-8 shadow-[0_6px_24px_rgba(13,27,42,0.05)] dark:border-white/10 dark:bg-slate-900"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-brand-violet font-sora text-lg font-extrabold text-night">
                {index + 1}
              </div>
              <h3 className="mb-2.5 font-sora text-lg font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-[#6B7280] dark:text-slate-400">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STATS SHOWCASE */}
      <section className="px-4 pb-16 pt-2 sm:px-6 lg:px-14 lg:pb-24">
        <h2 className="mb-12 text-center font-sora text-2xl font-bold sm:text-[34px]">
          Le tableau de bord qui parle aux passionnés
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gold/30 bg-gradient-to-b from-gold/10 to-white p-6 shadow-[0_6px_24px_rgba(13,27,42,0.05)] dark:from-gold/10 dark:to-slate-900">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-gold">Numéros chauds</div>
            {hottest.length > 0 ? (
              <>
                <div className="mb-3.5 flex h-[70px] items-end gap-2">
                  {hottest.map((s) => (
                    <div
                      key={s.number}
                      className="flex-1 rounded-t bg-gradient-to-b from-gold-light to-gold"
                      style={{ height: `${Math.max(20, ((s.count ?? 0) / maxHot) * 100)}%` }}
                    />
                  ))}
                </div>
                <div className="text-[13px] text-[#6B7280] dark:text-slate-400">
                  {hottest.map((s) => s.number).join(' · ')} sortent le plus souvent
                </div>
              </>
            ) : (
              <p className="text-[13px] text-[#6B7280] dark:text-slate-400">Données en cours de collecte.</p>
            )}
          </div>

          <div className="rounded-2xl border border-night/[0.08] bg-white p-6 shadow-[0_6px_24px_rgba(13,27,42,0.05)] dark:border-white/10 dark:bg-slate-900">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-violet">Numéros en retard</div>
            {delayed.length > 0 ? (
              <div className="mb-3.5 flex flex-col gap-2.5 text-sm">
                {delayed.map((s) => (
                  <div key={s.number} className="flex justify-between">
                    <span>N°{s.number}</span>
                    <span className="font-semibold text-brand-violet">{s.delay} tirages</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[#6B7280] dark:text-slate-400">Données en cours de collecte.</p>
            )}
            <Link href="/retards" className="text-[13px] text-brand-violet hover:underline">Tous les retards →</Link>
          </div>

          <div className="rounded-2xl border border-night/[0.08] bg-white p-6 shadow-[0_6px_24px_rgba(13,27,42,0.05)] dark:border-white/10 dark:bg-slate-900">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-pink">Paires fréquentes</div>
            {pairCombos.length > 0 ? (
              <div className="mb-3.5 flex flex-col gap-2.5 text-sm">
                {pairCombos.map((combo) => (
                  <div key={combo.numbers.join('-')} className="flex justify-between">
                    <span>{combo.numbers.join(' – ')}</span>
                    <span className="font-semibold text-brand-pink">{combo.count} fois</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[#6B7280] dark:text-slate-400">Données en cours de collecte.</p>
            )}
            <div className="text-[13px] text-[#6B7280] dark:text-slate-400">Sur l&apos;historique complet</div>
          </div>

          <div className="rounded-2xl border border-brand-green/25 bg-gradient-to-b from-brand-green/10 to-white p-6 shadow-[0_6px_24px_rgba(13,27,42,0.05)] dark:from-brand-green/10 dark:to-slate-900">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-green">Monte-Carlo</div>
            <div className="mb-2 font-sora text-2xl font-extrabold text-brand-green">
              {MONTE_CARLO_ANONYMOUS_ITERATIONS.toLocaleString('fr-FR')}
            </div>
            <div className="mb-3.5 text-[13px] text-[#6B7280] dark:text-slate-400">
              simulations lancées à chaque analyse pour comparer ta grille au hasard pur — jusqu&apos;à{' '}
              {MONTE_CARLO_PREMIUM_ITERATIONS.toLocaleString('fr-FR')} avec Premium.
            </div>
            <Link href="/simulations" className="text-[13px] text-brand-green hover:underline">Résultat expliqué, jamais garanti →</Link>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="relative mx-4 mb-16 overflow-hidden rounded-[28px] border border-gold/25 bg-[linear-gradient(120deg,#1a1030,#0D1B2A_45%,#241305)] px-6 py-16 text-center text-white sm:mx-6 lg:mx-14 lg:px-14">
        <div className="animate-drift pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(244,196,48,0.35),transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(157,78,221,0.3),transparent_70%)] [animation:drift_10s_ease-in-out_infinite_alternate-reverse]" />
        <h2 className="relative mb-3 font-sora text-2xl font-extrabold sm:text-4xl">Prêt à jouer plus intelligemment ?</h2>
        <p className="relative mb-7 text-[#B7C0D1]">Rejoins les joueurs qui préfèrent la donnée à l&apos;intuition.</p>
        <Link
          href="/generateur"
          className="relative inline-block rounded-2xl bg-gradient-to-br from-gold-light via-gold to-gold-dark px-9 py-4 font-sora text-base font-bold text-night shadow-[0_10px_34px_rgba(244,196,48,0.5)] transition hover:brightness-105"
        >
          Générer ma grille gratuitement
        </Link>
      </section>
    </div>
  );
}
