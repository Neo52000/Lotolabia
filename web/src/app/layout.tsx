import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import Link from 'next/link';

import { INDEPENDENCE, SITE_URL } from '@/lib/api';
import { Logo, Wordmark } from '@/components/brand';

import './globals.css';

const sora = Sora({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-sora' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter' });

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
  { href: '/premium', label: 'Premium' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${sora.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-cream font-inter text-night dark:bg-night dark:text-slate-100">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2"
        >
          Aller au contenu
        </a>
        <header className="sticky top-0 z-20 border-b border-gold/25 bg-white/85 backdrop-blur-md dark:border-gold/20 dark:bg-night/85">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-3">
              <Logo />
              <Wordmark className="dark:text-white" />
            </Link>
            <nav aria-label="Navigation principale" className="hidden items-center gap-7 text-sm font-medium text-[#5B6472] dark:text-slate-300 lg:flex">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-night dark:hover:text-white">
                  {item.label}
                </Link>
              ))}
              <Link href="/connexion" className="hover:text-night dark:hover:text-white">
                Se connecter
              </Link>
              <Link
                href="/connexion"
                className="rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-dark px-5 py-2.5 font-sora text-sm font-bold text-night shadow-[0_4px_18px_rgba(244,196,48,0.4)] transition hover:brightness-105 hover:shadow-[0_6px_22px_rgba(244,196,48,0.5)]"
              >
                Essayer gratuitement
              </Link>
            </nav>
            <details className="group relative lg:hidden">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-night/10 text-night dark:border-white/20 dark:text-white">
                <span className="sr-only">Menu</span>
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M3 5h14M3 10h14M3 15h14" />
                </svg>
              </summary>
              <nav
                aria-label="Navigation mobile"
                className="absolute right-0 top-12 z-30 flex w-56 flex-col gap-1 rounded-2xl border border-gold/25 bg-white p-3 text-sm font-medium shadow-[0_20px_50px_rgba(13,27,42,0.15)] dark:border-gold/20 dark:bg-night"
              >
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 hover:bg-night/5 dark:hover:bg-white/10">
                    {item.label}
                  </Link>
                ))}
                <Link href="/connexion" className="rounded-lg px-3 py-2 hover:bg-night/5 dark:hover:bg-white/10">
                  Se connecter
                </Link>
                <Link
                  href="/connexion"
                  className="mt-1 rounded-lg bg-gradient-to-br from-gold-light via-gold to-gold-dark px-3 py-2 text-center font-sora font-bold text-night"
                >
                  Essayer gratuitement
                </Link>
              </nav>
            </details>
          </div>
        </header>
        <main id="contenu" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-night/10 dark:border-white/10">
          <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 text-sm sm:px-6">
            <div className="flex flex-wrap justify-between gap-10">
              <div className="max-w-xs">
                <Wordmark className="mb-2 text-base dark:text-white" />
                <p className="text-[13.5px] leading-relaxed text-[#6B7280] dark:text-slate-400">
                  Laboratoire statistique indépendant. Aucune affiliation avec la FDJ ou tout autre
                  opérateur de jeux.
                </p>
              </div>
              <div className="flex flex-wrap gap-10">
                <div className="flex flex-col gap-2">
                  <p className="mb-1 font-semibold">Produit</p>
                  <Link href="/statistiques" className="text-[#6B7280] hover:underline dark:text-slate-400">Statistiques</Link>
                  <Link href="/generateur" className="text-[#6B7280] hover:underline dark:text-slate-400">Générateur</Link>
                  <Link href="/premium" className="text-[#6B7280] hover:underline dark:text-slate-400">Premium</Link>
                  <Link href="/blog" className="text-[#6B7280] hover:underline dark:text-slate-400">Blog</Link>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="mb-1 font-semibold">Légal</p>
                  <Link href="/confidentialite" className="text-[#6B7280] hover:underline dark:text-slate-400">Confidentialité</Link>
                  <Link href="/mentions-legales" className="text-[#6B7280] hover:underline dark:text-slate-400">Mentions légales</Link>
                  <Link href="/jeu-responsable" className="text-[#6B7280] hover:underline dark:text-slate-400">Jeu responsable</Link>
                  <Link href="/faq" className="text-[#6B7280] hover:underline dark:text-slate-400">FAQ</Link>
                  <Link href="/contact" className="text-[#6B7280] hover:underline dark:text-slate-400">Contact</Link>
                </div>
              </div>
            </div>
            <p className="font-semibold">
              Jouer comporte des risques : endettement, isolement, dépendance. Les jeux
              d&apos;argent sont interdits aux mineurs (18+). Aide : 09&nbsp;74&nbsp;75&nbsp;13&nbsp;13
              (appel non surtaxé).
            </p>
            <p className="text-xs text-[#8A93A6]">{INDEPENDENCE}</p>
            <p className="text-xs text-[#9AA2B2]">© {new Date().getFullYear()} LotoLab IA — Outil indépendant d&apos;analyse statistique.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
