import type { Metadata } from 'next';

import { api } from '@/lib/api';
import { BarList, Breadcrumbs, Disclaimer, EmptyData, Section } from '@/components/ui';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Fréquences de sortie des numéros du Loto',
  description:
    'Fréquence absolue et relative de chaque numéro du Loto (1 à 49) et de chaque numéro ' +
    'Chance (1 à 10) sur l’historique officiel, avec explication de la méthode de calcul.',
  alternates: { canonical: '/frequences' },
};

export default async function FrequenciesPage() {
  const [full, recent] = await Promise.all([api.frequencies(), api.frequencies(50)]);
  const hasData = full && full.draw_count > 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Statistiques', href: '/statistiques' }, { label: 'Fréquences' }]} />
      <h1 className="text-2xl font-bold">Fréquences de sortie des numéros</h1>
      {hasData ? (
        <>
          <p className="max-w-3xl text-sm opacity-80">
            {full!.explanation} Période analysée : {full!.period_start} → {full!.period_end}{' '}
            ({full!.draw_count} tirages). Mise à jour automatique après chaque tirage.
          </p>
          <Section title="Numéros principaux (1-49) — historique complet">
            <BarList
              items={[...full!.numbers]
                .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
                .map((stat) => ({
                  label: String(stat.number),
                  value: stat.count ?? 0,
                  display: `${stat.count}× (${(((stat.relative ?? 0) as number) * 100).toFixed(1)} %)`,
                  href: `/numero/${stat.number}`,
                }))}
            />
          </Section>
          {recent && recent.draw_count > 0 ? (
            <Section title="Sur les 50 derniers tirages">
              <BarList
                items={[...recent.numbers]
                  .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
                  .slice(0, 15)
                  .map((stat) => ({
                    label: String(stat.number),
                    value: stat.count ?? 0,
                    display: `${stat.count}×`,
                    href: `/numero/${stat.number}`,
                  }))}
              />
            </Section>
          ) : null}
          <Section title="Numéro Chance (1-10)">
            <BarList
              items={[...full!.chance]
                .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
                .map((stat) => ({
                  label: String(stat.number),
                  value: stat.count ?? 0,
                  display: `${stat.count}×`,
                  href: `/numero-chance/${stat.number}`,
                }))}
            />
          </Section>
        </>
      ) : (
        <EmptyData />
      )}
      <Disclaimer />
    </div>
  );
}
