'use client';

import Link from 'next/link';
import { useState } from 'react';

import { openBillingPortal, startCheckout } from '@/lib/premiumClient';
import { usePremiumStatus } from '@/lib/usePremiumStatus';

const FREE_FEATURES = [
  'Statistiques complètes : fréquences, retards, historique, profils',
  'Générateur : méthodes aléatoire et fréquence, jusqu’à 3 grilles',
  'Simulations Monte-Carlo jusqu’à 10 000 grilles',
];

const PREMIUM_FEATURES = [
  'Générateur : les 6 méthodes (équilibré, écarts, somme contrôlée, diversifié…)',
  'Jusqu’à 20 grilles par génération',
  'Simulations Monte-Carlo jusqu’à 250 000 grilles',
  'Sans engagement, résiliable en ligne à tout moment',
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mb-8 flex flex-col gap-3.5 text-[14.5px]">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <span className="font-bold text-brand-green">✓</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function BillingToggle() {
  const [annual, setAnnual] = useState(true);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = usePremiumStatus();

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.');
      setBusy(false);
    }
  }

  const premiumCta = (() => {
    if (status.loading) {
      return <div className="h-[52px] animate-pulse rounded-xl bg-gold/20" aria-hidden="true" />;
    }
    if (status.tier === 'premium') {
      return (
        <div className="space-y-3">
          <p className="rounded-xl bg-brand-green/10 py-3 text-center font-sora text-sm font-bold text-brand-green">
            Premium actif ✓
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(openBillingPortal)}
            className="block w-full rounded-xl border border-night/15 bg-white py-3.5 text-center font-sora text-[15px] font-bold text-night disabled:opacity-60 dark:border-white/20 dark:bg-slate-800 dark:text-white"
          >
            {busy ? 'Ouverture…' : 'Gérer ou résilier mon abonnement'}
          </button>
        </div>
      );
    }
    if (!status.signedIn) {
      return (
        <Link
          href="/connexion?next=/premium"
          className="block w-full rounded-xl bg-gradient-to-br from-gold-light via-gold to-gold-dark py-3.5 text-center font-sora text-[15px] font-bold text-night shadow-[0_8px_26px_rgba(244,196,48,0.4)] transition hover:brightness-105"
        >
          Se connecter pour passer Premium
        </Link>
      );
    }
    return (
      <div className="space-y-3">
        <label className="flex items-start gap-2.5 text-left text-xs leading-relaxed text-[#495064] dark:text-slate-300">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
          />
          <span>
            J&apos;accepte les{' '}
            <Link href="/cgv" className="underline" target="_blank">
              conditions générales de vente
            </Link>{' '}
            et je demande l&apos;accès immédiat au service Premium ; je renonce ainsi à mon droit de
            rétractation de 14 jours.
          </span>
        </label>
        <button
          type="button"
          disabled={!consent || busy}
          onClick={() => run(() => startCheckout(annual ? 'yearly' : 'monthly'))}
          className="block w-full rounded-xl bg-gradient-to-br from-gold-light via-gold to-gold-dark py-3.5 text-center font-sora text-[15px] font-bold text-night shadow-[0_8px_26px_rgba(244,196,48,0.4)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Redirection vers le paiement…' : 'Passer Premium'}
        </button>
      </div>
    );
  })();

  return (
    <div>
      <div className="mb-12 inline-flex items-center gap-1 rounded-full bg-[#F1F3F7] p-1.5 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setAnnual(false)}
          className={`rounded-full px-5 py-2.5 font-sora text-[13.5px] font-bold transition ${
            !annual ? 'bg-white text-night shadow-[0_2px_8px_rgba(13,27,42,0.08)] dark:bg-slate-700 dark:text-white' : 'text-[#6B7280] dark:text-slate-400'
          }`}
        >
          Mensuel
        </button>
        <button
          type="button"
          onClick={() => setAnnual(true)}
          className={`rounded-full px-5 py-2.5 font-sora text-[13.5px] font-bold transition ${
            annual ? 'bg-white text-night shadow-[0_2px_8px_rgba(13,27,42,0.08)] dark:bg-slate-700 dark:text-white' : 'text-[#6B7280] dark:text-slate-400'
          }`}
        >
          Annuel · -33%
        </button>
      </div>

      <div id="plans-grid" className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-night/[0.08] bg-white p-9 text-left shadow-[0_8px_30px_rgba(13,27,42,0.05)] dark:border-white/10 dark:bg-slate-900">
          <div className="mb-1.5 font-sora text-lg font-bold">Free</div>
          <div className="mb-6 text-sm text-[#6B7280] dark:text-slate-400">Avec un compte gratuit</div>
          <div className="mb-7 font-sora text-4xl font-extrabold">
            0€ <span className="text-sm font-medium text-[#8A93A6]">/ toujours</span>
          </div>
          <FeatureList items={FREE_FEATURES} />
          {!status.signedIn && !status.loading && (
            <Link
              href="/connexion?next=/premium"
              className="block w-full rounded-xl border border-night/15 bg-white py-3.5 text-center font-sora text-[15px] font-bold text-night dark:border-white/20 dark:bg-slate-800 dark:text-white"
            >
              Créer un compte gratuit
            </Link>
          )}
        </div>

        <div className="relative rounded-3xl border border-gold/50 bg-gradient-to-b from-gold/[0.08] to-white p-9 text-left shadow-[0_20px_50px_rgba(244,196,48,0.18)] dark:from-gold/10 dark:to-slate-900">
          <div className="absolute -top-3.5 right-7 rounded-full bg-gradient-to-br from-gold-light to-gold px-4 py-1.5 font-sora text-xs font-bold text-[#5A3F00]">
            Le plus choisi
          </div>
          <div className="mb-1.5 font-sora text-lg font-bold">Premium</div>
          <div className="mb-6 text-sm text-[#6B7280] dark:text-slate-400">Pour les passionnés qui veulent tout explorer</div>
          <div className="mb-1 font-sora text-4xl font-extrabold">
            {annual ? '3,33€' : '4,99€'}{' '}
            <span className="text-sm font-medium text-[#8A93A6]">/ mois</span>
          </div>
          <div className="mb-7 text-xs text-[#8A93A6]">
            {annual ? 'soit 39,96 € TTC facturés chaque année' : '4,99 € TTC facturés chaque mois'} · renouvellement
            automatique
          </div>
          <FeatureList items={PREMIUM_FEATURES} />
          {premiumCta}
          {error && <p className="mt-3 text-center text-xs text-brand-pink">{error}</p>}
        </div>
      </div>
    </div>
  );
}
