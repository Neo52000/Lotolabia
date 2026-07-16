import type { Metadata } from 'next';
import Link from 'next/link';

import { api, formatDateFr } from '@/lib/api';
import {
  BarList,
  Disclaimer,
  DrawBalls,
  EmptyData,
  Independence,
  Section,
  topByCount,
  topByDelay,
} from '@/components/ui';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'LotoLab IA — Analyse statistique indépendante du Loto',
  description:
    'Dernier tirage du Loto, fréquences, retards et tendances sur l’historique officiel. ' +
    'Un laboratoire statistique transparent et pédagogique — sans fausse promesse.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [latest, frequencies, delays] = await Promise.all([
    api.latestDraw(),
    api.frequencies(),
    api.delays(),
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-night p-8 text-white md:p-12">
        <h1 className="text-3xl font-bold md:text-4xl">
          Analysez. Comprenez. <span className="text-primary">Jouez mieux.</span>
        </h1>
        <p className="mt-4 max-w-2xl opacity-90">
          LotoLab IA est un laboratoire statistique indépendant : fréquences, retards, paires,
          tendances et simulations pédagogiques calculées sur l&apos;historique officiel des
          tirages du Loto. Sans prédiction, sans promesse — juste des données expliquées.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/statistiques"
            className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white hover:opacity-90"
          >
            Explorer les statistiques
          </Link>
          <Link
            href="/generateur"
            className="rounded-lg border border-white/40 px-5 py-2.5 font-semibold hover:bg-white/10"
          >
            Générateur expérimental
          </Link>
        </div>
      </section>

      <Section title="Dernier tirage">
        {latest ? (
          <div className="space-y-3">
            <p className="text-sm opacity-80">{formatDateFr(latest.draw_date)}</p>
            <DrawBalls draw={latest} />
            <Link href={`/tirage/${latest.draw_date}`} className="inline-block text-sm text-primary hover:underline">
              Analyse détaillée de ce tirage →
            </Link>
          </div>
        ) : (
          <EmptyData />
        )}
      </Section>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Numéros les plus fréquents">
          {frequencies && frequencies.draw_count > 0 ? (
            <>
              <BarList
                items={topByCount(frequencies.numbers).map((stat) => ({
                  label: String(stat.number),
                  value: stat.count ?? 0,
                  display: `${stat.count} sorties`,
                  href: `/numero/${stat.number}`,
                }))}
              />
              <Link href="/frequences" className="mt-4 inline-block text-sm text-primary hover:underline">
                Toutes les fréquences →
              </Link>
            </>
          ) : (
            <EmptyData />
          )}
        </Section>
        <Section title="Retards les plus longs">
          {delays && delays.draw_count > 0 ? (
            <>
              <BarList
                items={topByDelay(delays.numbers).map((stat) => ({
                  label: String(stat.number),
                  value: stat.delay ?? 0,
                  display: `${stat.delay} tirages`,
                  href: `/numero/${stat.number}`,
                }))}
              />
              <Link href="/retards" className="mt-4 inline-block text-sm text-primary hover:underline">
                Tous les retards →
              </Link>
            </>
          ) : (
            <EmptyData />
          )}
        </Section>
      </div>

      <Section title="Comprendre avant de jouer">
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <Link href="/methodologie" className="rounded-lg border border-slate-200 p-4 hover:border-primary dark:border-slate-700">
            <h3 className="font-semibold">Méthodologie</h3>
            <p className="mt-1 opacity-80">D&apos;où viennent les données, comment chaque statistique est calculée.</p>
          </Link>
          <Link href="/probabilites" className="rounded-lg border border-slate-200 p-4 hover:border-primary dark:border-slate-700">
            <h3 className="font-semibold">Probabilités réelles</h3>
            <p className="mt-1 opacity-80">1 chance sur 19 068 840 : ce que cela signifie concrètement.</p>
          </Link>
          <Link href="/jeu-responsable" className="rounded-lg border border-slate-200 p-4 hover:border-primary dark:border-slate-700">
            <h3 className="font-semibold">Jeu responsable</h3>
            <p className="mt-1 opacity-80">Garder le contrôle, limites, ressources d&apos;aide.</p>
          </Link>
        </div>
      </Section>

      <Disclaimer />
      <Independence />
    </div>
  );
}
