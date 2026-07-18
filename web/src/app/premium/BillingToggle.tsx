'use client';

import { useState } from 'react';

export default function BillingToggle() {
  const [annual, setAnnual] = useState(true);

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
          <div className="mb-6 text-sm text-[#6B7280] dark:text-slate-400">Pour découvrir les stats de base</div>
          <div className="mb-7 font-sora text-4xl font-extrabold">
            0€ <span className="text-sm font-medium text-[#8A93A6]">/ toujours</span>
          </div>
          <ul className="mb-8 flex flex-col gap-3.5 text-[14.5px]">
            <li className="flex gap-2.5"><span className="font-bold text-brand-green">✓</span>Fréquences et écarts (historique limité)</li>
            <li className="flex gap-2.5"><span className="font-bold text-brand-green">✓</span>Générateur : méthodes aléatoire et fréquence</li>
            <li className="flex gap-2.5"><span className="font-bold text-brand-green">✓</span>Export CSV (100 lignes)</li>
            <li className="flex gap-2.5 text-[#B0B6C2]"><span className="font-bold">✕</span>Simulations Monte-Carlo avancées</li>
            <li className="flex gap-2.5 text-[#B0B6C2]"><span className="font-bold">✕</span>Export PDF</li>
          </ul>
          <a
            href="/connexion"
            className="block w-full rounded-xl border border-night/15 bg-white py-3.5 text-center font-sora text-[15px] font-bold text-night dark:border-white/20 dark:bg-slate-800 dark:text-white"
          >
            Continuer gratuitement
          </a>
        </div>

        <div className="relative rounded-3xl border border-gold/50 bg-gradient-to-b from-gold/[0.08] to-white p-9 text-left shadow-[0_20px_50px_rgba(244,196,48,0.18)] dark:from-gold/10 dark:to-slate-900">
          <div className="absolute -top-3.5 right-7 rounded-full bg-gradient-to-br from-gold-light to-gold px-4 py-1.5 font-sora text-xs font-bold text-[#5A3F00]">
            Le plus choisi
          </div>
          <div className="mb-1.5 font-sora text-lg font-bold">Premium</div>
          <div className="mb-6 text-sm text-[#6B7280] dark:text-slate-400">Pour les passionnés qui veulent tout voir</div>
          <div className="mb-7 font-sora text-4xl font-extrabold">
            {annual ? '3,33€' : '4,99€'}{' '}
            <span className="text-sm font-medium text-[#8A93A6]">
              {annual ? '/ mois, facturé annuellement' : '/ mois'}
            </span>
          </div>
          <ul className="mb-8 flex flex-col gap-3.5 text-[14.5px]">
            <li className="flex gap-2.5"><span className="font-bold text-brand-green">✓</span>Historique complet illimité</li>
            <li className="flex gap-2.5"><span className="font-bold text-brand-green">✓</span>Générateur : les 6 méthodes, grilles illimitées</li>
            <li className="flex gap-2.5"><span className="font-bold text-brand-green">✓</span>Simulations Monte-Carlo jusqu&apos;à 250 000 itérations</li>
            <li className="flex gap-2.5"><span className="font-bold text-brand-green">✓</span>Export CSV et PDF complet</li>
            <li className="flex gap-2.5"><span className="font-bold text-brand-green">✓</span>Statistiques avancées et alertes nouveau tirage</li>
          </ul>
          <a
            href="/connexion"
            className="block w-full rounded-xl bg-gradient-to-br from-gold-light via-gold to-gold-dark py-3.5 text-center font-sora text-[15px] font-bold text-night shadow-[0_8px_26px_rgba(244,196,48,0.4)] transition hover:brightness-105"
          >
            Passer Premium
          </a>
        </div>
      </div>
    </div>
  );
}
