import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-6xl font-bold text-brand">404</p>
      <h1 className="mt-4 text-xl font-semibold">Page introuvable</h1>
      <p className="mt-2 text-sm opacity-80">
        Cette page n&apos;existe pas ou n&apos;existe plus. Les statistiques, elles, sont toujours là.
      </p>
      <div className="mt-6 flex justify-center gap-3 text-sm">
        <Link href="/" className="rounded-xl bg-brand px-4 py-2 font-semibold text-night">Accueil</Link>
        <Link href="/statistiques" className="rounded-xl border border-slate-300 px-4 py-2 dark:border-slate-600">Statistiques</Link>
      </div>
    </div>
  );
}
