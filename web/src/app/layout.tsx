import type { Metadata } from 'next';
import Link from 'next/link';

import { INDEPENDENCE, SITE_URL } from '@/lib/api';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'LotoLab IA — Analysez. Comprenez. Jouez mieux.',
    template: '%s | LotoLab IA',
  },
  description:
    'Laboratoire statistique indépendant du Loto : fréquences, retards, paires, tendances, ' +
    'générateur expérimental et simulations pédagogiques. Aucune prédiction : des analyses transparentes.',
  openGraph: {
    siteName: 'LotoLab IA',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

const NAV = [
  { href: '/resultats', label: 'Résultats' },
  { href: '/historique', label: 'Historique' },
  { href: '/statistiques', label: 'Statistiques' },
  { href: '/generateur', label: 'Générateur' },
  { href: '/simulations', label: 'Simulations' },
  { href: '/methodologie', label: 'Méthodologie' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-night dark:text-slate-100">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2"
        >
          Aller au contenu
        </a>
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-night">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden focusable="false">
                <defs>
                  <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#00B4FF" />
                    <stop offset="1" stopColor="#9D4EDD" />
                  </linearGradient>
                </defs>
                <circle cx="24" cy="24" r="21" fill="url(#lg)" />
                <path
                  d="M17 13v17h6M31 22a5.5 5.5 0 1 1 0 8"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                />
              </svg>
              LotoLab <span className="text-brand">IA</span>
            </Link>
            <nav aria-label="Navigation principale" className="flex flex-wrap gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main id="contenu" className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-night">
          <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 text-sm">
            <p className="font-semibold">
              Jouer comporte des risques : endettement, isolement, dépendance. Les jeux
              d&apos;argent sont interdits aux mineurs (18+). Aide : 09&nbsp;74&nbsp;75&nbsp;13&nbsp;13
              (appel non surtaxé).
            </p>
            <p className="opacity-70">{INDEPENDENCE}</p>
            <nav aria-label="Pied de page" className="flex flex-wrap gap-x-4 gap-y-1 opacity-80">
              <Link href="/probabilites" className="hover:underline">Probabilités</Link>
              <Link href="/jeu-responsable" className="hover:underline">Jeu responsable</Link>
              <Link href="/faq" className="hover:underline">FAQ</Link>
              <Link href="/blog" className="hover:underline">Blog</Link>
              <Link href="/mentions-legales" className="hover:underline">Mentions légales</Link>
              <Link href="/confidentialite" className="hover:underline">Confidentialité</Link>
              <Link href="/contact" className="hover:underline">Contact</Link>
            </nav>
            <p className="opacity-60">© {new Date().getFullYear()} LotoLab IA.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
