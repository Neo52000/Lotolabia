'use client';

import Link from 'next/link';
import { useRef } from 'react';

export default function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    detailsRef.current?.removeAttribute('open');
  }

  return (
    <details ref={detailsRef} className="group relative lg:hidden">
      <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-night/10 text-night dark:border-white/20 dark:text-white">
        <span className="sr-only">Menu</span>
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </summary>
      <nav
        aria-label="Navigation mobile"
        onClick={closeMenu}
        className="absolute right-0 top-12 z-30 flex w-56 flex-col gap-1 rounded-2xl border border-gold/25 bg-white p-3 text-sm font-medium shadow-[0_20px_50px_rgba(13,27,42,0.15)] dark:border-gold/20 dark:bg-night"
      >
        {items.map((item) => (
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
  );
}
