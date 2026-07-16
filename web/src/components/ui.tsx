import Link from 'next/link';

import { DISCLAIMER, INDEPENDENCE, type Draw, type NumberStat } from '@/lib/api';

export function NumberBall({ n, chance = false, size = 'md' }: { n: number; chance?: boolean; size?: 'sm' | 'md' }) {
  const dimension = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-11 w-11 text-base';
  const gradient = chance
    ? 'from-brand-pink to-brand-violet'
    : 'from-brand to-brand-violet';
  return (
    <span
      aria-label={chance ? `Numéro Chance ${n}` : `Numéro ${n}`}
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ${gradient} ${dimension}`}
    >
      {n}
    </span>
  );
}

export function DrawBalls({ draw, size = 'md' }: { draw: Draw; size?: 'sm' | 'md' }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {draw.numbers.map((n) => (
        <NumberBall key={n} n={n} size={size} />
      ))}
      <NumberBall n={draw.chance} chance size={size} />
    </span>
  );
}

export function Disclaimer() {
  return (
    <p className="rounded-xl border border-brand-yellow/40 bg-brand-yellow/10 p-4 text-sm">
      ⚠️ {DISCLAIMER}
    </p>
  );
}

export function Independence() {
  return <p className="text-xs opacity-70">{INDEPENDENCE}</p>;
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** Barres horizontales 100 % SVG/CSS server-rendered (Core Web Vitals). */
export function BarList({
  items,
  labelHref,
}: {
  items: { label: string; value: number; display: string; href?: string }[];
  labelHref?: (label: string) => string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3 text-sm">
          <span className="w-10 shrink-0 font-semibold">
            {item.href || labelHref ? (
              <Link className="text-brand hover:underline" href={item.href ?? labelHref!(item.label)}>
                {item.label}
              </Link>
            ) : (
              item.label
            )}
          </span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-brand to-brand-violet"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </span>
          <span className="w-20 shrink-0 text-right tabular-nums opacity-80">{item.display}</span>
        </li>
      ))}
    </ul>
  );
}

/** Squelette de `Section` pendant le chargement (streaming Suspense via `loading.tsx`). */
export function SkeletonSection({ lines = 4 }: { lines?: number }) {
  return (
    <section
      className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      aria-hidden="true"
    >
      <div className="mb-4 h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
      <SkeletonBarList lines={lines} />
    </section>
  );
}

/** Squelette de `BarList` — mêmes proportions pour éviter tout saut visuel à l'arrivée des données. */
export function SkeletonBarList({ lines = 5 }: { lines?: number }) {
  return (
    <ul className="animate-pulse space-y-1.5" aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <li key={index} className="flex items-center gap-3">
          <span className="h-4 w-10 shrink-0 rounded bg-slate-200 dark:bg-slate-800" />
          <span className="h-2.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800" />
          <span className="h-4 w-16 shrink-0 rounded bg-slate-200 dark:bg-slate-800" />
        </li>
      ))}
    </ul>
  );
}

export function DrawFacts({ numbers }: { numbers: number[] }) {
  const sum = numbers.reduce((a, b) => a + b, 0);
  const even = numbers.filter((n) => n % 2 === 0).length;
  const low = numbers.filter((n) => n <= 24).length;
  const facts = [
    { label: 'Somme', value: String(sum) },
    { label: 'Amplitude', value: String(Math.max(...numbers) - Math.min(...numbers)) },
    { label: 'Pairs / impairs', value: `${even} / ${5 - even}` },
    { label: 'Bas / haut', value: `${low} / ${5 - low}` },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
      {facts.map((fact) => (
        <div key={fact.label} className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
          <dt className="text-xs opacity-70">{fact.label}</dt>
          <dd className="font-semibold">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyData() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm opacity-80 dark:border-slate-600">
      Les données des tirages sont en cours de collecte. Cette page se remplira automatiquement
      après la première synchronisation avec les résultats officiels.
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-4 text-sm opacity-80">
      <ol className="flex flex-wrap gap-1">
        <li>
          <Link href="/" className="hover:underline">
            Accueil
          </Link>
          <span aria-hidden> › </span>
        </li>
        {items.map((item, index) => (
          <li key={item.label}>
            {item.href ? (
              <Link href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
            {index < items.length - 1 && <span aria-hidden> › </span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function topByCount(stats: NumberStat[], take = 10) {
  return [...stats]
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, take);
}

export function topByDelay(stats: NumberStat[], take = 10) {
  return [...stats]
    .filter((stat) => stat.delay !== null && stat.delay !== undefined)
    .sort((a, b) => (b.delay ?? 0) - (a.delay ?? 0))
    .slice(0, take);
}
