'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getSupabase, supabaseConfigured } from '@/lib/adminApi';

const NAV = [
  { href: '/admin', label: 'Tableau de bord' },
  { href: '/admin/imports', label: 'Imports' },
  { href: '/admin/quarantine', label: 'Quarantaine' },
  { href: '/admin/draws', label: 'Tirages' },
  { href: '/admin/users', label: 'Utilisateurs' },
  { href: '/admin/subscriptions', label: 'Abonnements' },
  { href: '/admin/seo', label: 'Contenus SEO' },
  { href: '/admin/ads', label: 'Publicités' },
  { href: '/admin/audit', label: 'Audit & état' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setSignedIn(false);
      return;
    }
    const supabase = getSupabase();

    async function checkAdminRole(userId: string | undefined) {
      if (!userId) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      setIsAdmin(data?.role === 'admin');
    }

    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
      checkAdminRole(data.session?.user.id);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      checkAdminRole(session?.user.id);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const { error: authError } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    if (authError) setError(authError.message);
  }

  if (signedIn === null) {
    return <p className="py-16 text-center text-sm opacity-70">Chargement…</p>;
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-sm space-y-4 py-12">
        <h1 className="text-xl font-bold">Back-office LotoLab IA</h1>
        {!supabaseConfigured ? (
          <p className="rounded-lg bg-brand-yellow/15 p-4 text-sm">
            Configuration requise : renseignez NEXT_PUBLIC_SUPABASE_URL et
            NEXT_PUBLIC_SUPABASE_ANON_KEY pour activer la connexion administrateur.
          </p>
        ) : (
          <form onSubmit={signIn} className="space-y-3">
            <input
              type="email"
              required
              placeholder="E-mail administrateur"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            />
            <input
              type="password"
              required
              placeholder="Mot de passe"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            />
            <button type="submit" className="w-full rounded-xl bg-brand px-4 py-2 font-semibold text-night">
              Se connecter
            </button>
            {error && <p className="text-sm text-brand-pink">{error}</p>}
          </form>
        )}
        <p className="text-xs opacity-60">
          Accès réservé aux comptes disposant du rôle administrateur. Toutes les actions sont
          journalisées.
        </p>
      </div>
    );
  }

  if (isAdmin === null) {
    return <p className="py-16 text-center text-sm opacity-70">Chargement…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-sm space-y-4 py-12 text-center">
        <h1 className="text-xl font-bold">Accès réservé aux administrateurs</h1>
        <p className="text-sm opacity-70">
          Ce compte est authentifié mais ne dispose pas du rôle administrateur.
        </p>
        <button
          onClick={() => getSupabase().auth.signOut()}
          className="rounded-lg px-3 py-2 text-sm text-brand-pink hover:underline"
        >
          Déconnexion
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[210px,1fr]">
      <aside>
        <nav aria-label="Back-office" className="flex flex-row flex-wrap gap-1 md:flex-col">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm ${
                pathname === item.href
                  ? 'bg-brand/15 font-semibold text-brand'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => getSupabase().auth.signOut()}
            className="rounded-lg px-3 py-2 text-left text-sm text-brand-pink hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Déconnexion
          </button>
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
