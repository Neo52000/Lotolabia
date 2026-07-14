'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-6xl font-bold text-brand-pink">500</p>
      <h1 className="mt-4 text-xl font-semibold">Une erreur est survenue</h1>
      <p className="mt-2 text-sm opacity-80">
        L&apos;incident a été enregistré. Vous pouvez réessayer.
      </p>
      <button onClick={reset} className="mt-6 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-night">
        Réessayer
      </button>
    </div>
  );
}
