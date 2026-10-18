'use client';

import Link from 'next/link';

import { usePremiumStatus } from '@/lib/usePremiumStatus';

export default function PremiumSuccess() {
  const status = usePremiumStatus();
  const active = status.tier === 'premium';

  return (
    <div className="space-y-5">
      <h1 className="font-sora text-3xl font-extrabold">Merci, ton paiement est reçu</h1>
      {status.loading ? (
        <p className="text-sm opacity-70">Vérification de ton accès…</p>
      ) : active ? (
        <p className="text-[15px]">Ton accès Premium est actif.</p>
      ) : (
        <p className="text-[15px]">
          Ton accès Premium s&apos;active dans quelques instants, dès que Stripe nous confirme le
          paiement. Recharge cette page si besoin.
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/generateur"
          className="rounded-xl bg-gradient-to-br from-gold-light via-gold to-gold-dark px-6 py-3 font-sora font-bold text-night"
        >
          Aller au générateur
        </Link>
        <Link href="/premium" className="rounded-xl border border-night/15 px-6 py-3 font-sora font-bold dark:border-white/20">
          Mon abonnement
        </Link>
      </div>
    </div>
  );
}
