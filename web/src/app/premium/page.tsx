import type { Metadata } from 'next';

import BillingToggle from './BillingToggle';

export const metadata: Metadata = {
  title: 'Premium — aller plus loin dans l’analyse',
  description:
    'Historique complet, les 6 méthodes du générateur, simulations Monte-Carlo étendues et ' +
    'export CSV/PDF. Premium donne accès à plus de données, jamais à plus de chances de gain.',
  alternates: { canonical: '/premium' },
};

export default function PremiumPage() {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="mb-2.5 font-sora text-3xl font-extrabold tracking-tight sm:text-4xl">
        Va plus loin dans l&apos;analyse
      </h1>
      <p className="mb-10 text-lg text-[#495064] dark:text-slate-300">
        Le Free suffit pour explorer. Le Premium enlève les limites.
      </p>

      <BillingToggle />

      <p className="mx-auto mt-9 max-w-xl text-xs leading-relaxed text-[#8A93A6]">
        ⚠ Premium donne accès à plus de données et d&apos;outils d&apos;analyse — il n&apos;augmente
        en rien tes chances réelles de gain. Jeu interdit aux mineurs — 18+.
      </p>
    </div>
  );
}
