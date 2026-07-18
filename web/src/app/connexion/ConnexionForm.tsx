'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { authConfigured, getAuthClient } from '@/lib/authClient';

type Tab = 'login' | 'signup';

export default function ConnexionForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignup = tab === 'signup';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (isSignup && !consent) {
      setError('Merci de confirmer avoir 18 ans ou plus pour créer un compte.');
      return;
    }
    setLoading(true);
    try {
      const supabase = getAuthClient();
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.push('/generateur');
          router.refresh();
        } else {
          setNotice('Compte créé. Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.');
          setTab('login');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push('/generateur');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex flex-1 items-center justify-center px-6 pb-16 pt-5">
      <div
        aria-hidden="true"
        className="animate-float absolute left-[12%] top-[8%] hidden h-[50px] w-[50px] rounded-full bg-[radial-gradient(circle_at_30%_28%,#fff8dd,#F4C430_60%,#A8790E_100%)] shadow-[0_0_22px_rgba(244,196,48,0.5)] sm:block"
      />
      <div
        aria-hidden="true"
        className="animate-float absolute bottom-[14%] right-[14%] hidden h-[34px] w-[34px] rounded-full bg-[radial-gradient(circle_at_30%_28%,#fff0f6,#FF7BAA_60%,#C81C63_100%)] shadow-[0_0_18px_rgba(255,77,141,0.45)] sm:block [animation-delay:.8s]"
      />
      <div
        aria-hidden="true"
        className="animate-float absolute right-[16%] top-[16%] hidden h-10 w-10 rounded-full bg-[radial-gradient(circle_at_30%_28%,#fff,#E7ECF5_55%,#9AA6BA_100%)] shadow-[0_6px_16px_rgba(13,27,42,0.15)] sm:block [animation-delay:.3s]"
      />

      <div className="relative w-full max-w-[420px] rounded-[26px] border border-gold/30 bg-white p-8 shadow-[0_24px_60px_rgba(13,27,42,0.1)] sm:p-10 dark:border-gold/20 dark:bg-slate-900">
        <div className="mb-7 flex gap-1 rounded-full bg-[#F1F3F7] p-1.5 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`flex-1 rounded-full py-2.5 font-sora text-[13.5px] font-bold transition ${
              !isSignup ? 'bg-white text-night shadow-[0_2px_8px_rgba(13,27,42,0.08)] dark:bg-slate-700 dark:text-white' : 'text-[#6B7280] dark:text-slate-400'
            }`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => setTab('signup')}
            className={`flex-1 rounded-full py-2.5 font-sora text-[13.5px] font-bold transition ${
              isSignup ? 'bg-white text-night shadow-[0_2px_8px_rgba(13,27,42,0.08)] dark:bg-slate-700 dark:text-white' : 'text-[#6B7280] dark:text-slate-400'
            }`}
          >
            Inscription
          </button>
        </div>

        <h1 className="mb-1.5 font-sora text-2xl font-extrabold">
          {isSignup ? 'Créer un compte' : 'Content de te revoir'}
        </h1>
        <p className="mb-6 text-sm text-[#6B7280] dark:text-slate-400">
          {isSignup
            ? 'Rejoins LotoLab IA pour suivre tes statistiques et grilles.'
            : 'Connecte-toi pour retrouver tes statistiques et grilles.'}
        </p>

        {!authConfigured ? (
          <p className="rounded-lg bg-gold/15 p-4 text-sm">
            Configuration requise : la connexion aux comptes n&apos;est pas encore activée sur cet
            environnement.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-[#495064] dark:text-slate-300">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="toi@exemple.fr"
                className="w-full rounded-xl border border-night/15 px-3.5 py-3 text-[14.5px] dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-[#495064] dark:text-slate-300">Mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-night/15 px-3.5 py-3 text-[14.5px] dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            {isSignup && (
              <label className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[#6B7280] dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-0.5"
                />
                J&apos;ai 18 ans ou plus et j&apos;accepte que LotoLab IA est un outil d&apos;analyse
                statistique indépendant, sans garantie de gain.
              </label>
            )}

            {error && <p className="rounded-lg bg-brand-pink/10 p-3 text-sm text-brand-pink">{error}</p>}
            {notice && <p className="rounded-lg bg-brand-green/10 p-3 text-sm text-brand-green">{notice}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-br from-gold-light via-gold to-gold-dark py-3.5 font-sora text-[15px] font-bold text-night shadow-[0_8px_26px_rgba(244,196,48,0.4)] transition hover:brightness-105 disabled:opacity-60"
            >
              {loading ? 'Un instant…' : isSignup ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-[12.5px] text-[#8A93A6]">
          <a href="#" className="text-[#8A6200] hover:underline">Mot de passe oublié ?</a>
        </p>
      </div>
    </div>
  );
}
