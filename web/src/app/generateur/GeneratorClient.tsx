'use client';

import { useEffect, useState } from 'react';

import { generateGrids, type GeneratorMethod } from '@/lib/generatorFallback';
import { supabaseAllDraws } from '@/lib/supabasePublic';
import { authConfigured, getAccessToken, getAuthClient } from '@/lib/authClient';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

const METHODS: { code: GeneratorMethod; label: string; explanation: string }[] = [
  {
    code: 'balanced',
    label: 'Équilibré',
    explanation:
      'Mélange les numéros chauds et les numéros en retard pour une grille équilibrée entre tendance et rattrapage statistique.',
  },
  {
    code: 'frequency',
    label: 'Fréquences',
    explanation: 'Favorise les numéros historiquement les plus sortis sur l’historique analysé.',
  },
  {
    code: 'delay',
    label: 'Écarts',
    explanation: 'Privilégie les numéros absents depuis le plus grand nombre de tirages consécutifs.',
  },
  {
    code: 'random',
    label: 'Aléatoire pur',
    explanation: 'Tirage totalement aléatoire, sans aucun biais statistique — la référence neutre.',
  },
  {
    code: 'sum_controlled',
    label: 'Somme contrôlée',
    explanation: 'Contraint la somme des cinq numéros dans une fourchette choisie (100 à 150 par défaut).',
  },
  {
    code: 'diversified',
    label: 'Diversifié',
    explanation: 'En générant plusieurs grilles d’un coup, chacune partage au maximum 2 numéros avec les précédentes.',
  },
];

const METHODS_USING_DRAWS = new Set<GeneratorMethod>(['frequency', 'delay']);

interface Grid {
  numbers: number[];
  chance: number;
  method: string;
  method_label: string;
  seed: number | null;
  warning: string;
}

export default function GeneratorClient() {
  const [method, setMethod] = useState<GeneratorMethod>('balanced');
  const [count, setCount] = useState(1);
  const [seed, setSeed] = useState('');
  const [sumMin, setSumMin] = useState('');
  const [sumMax, setSumMax] = useState('');
  const [grids, setGrids] = useState<Grid[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localFallback, setLocalFallback] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!authConfigured) return;
    const supabase = getAuthClient();
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function generate() {
    setLoading(true);
    setError(null);
    setSaveState('idle');
    const parsedSeed = seed.trim() !== '' && Number.isInteger(Number(seed)) ? Number(seed) : null;
    const parsedSumMin = sumMin.trim() !== '' && Number.isInteger(Number(sumMin)) ? Number(sumMin) : null;
    const parsedSumMax = sumMax.trim() !== '' && Number.isInteger(Number(sumMax)) ? Number(sumMax) : null;
    try {
      const response = await fetch(`${API_BASE}/api/v1/generator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          count,
          ...(parsedSeed !== null ? { seed: parsedSeed } : {}),
          ...(parsedSumMin !== null ? { sum_min: parsedSumMin } : {}),
          ...(parsedSumMax !== null ? { sum_max: parsedSumMax } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message ?? 'Génération impossible pour le moment.');
      }
      setGrids(data.grids);
      setLocalFallback(false);
    } catch {
      // API indisponible (pas encore hébergée) : génération calculée localement.
      try {
        const draws = METHODS_USING_DRAWS.has(method) ? await supabaseAllDraws() : [];
        const localGrids = generateGrids({
          method,
          count,
          seed: parsedSeed,
          sumMin: parsedSumMin,
          sumMax: parsedSumMax,
          draws,
        });
        setGrids(localGrids);
        setLocalFallback(true);
      } catch (fallbackErr) {
        setError(fallbackErr instanceof Error ? fallbackErr.message : 'Erreur inattendue.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveGrid(grid: Grid) {
    setSaveState('saving');
    try {
      const token = await getAccessToken();
      if (!token) {
        setSaveState('error');
        return;
      }
      const response = await fetch(`${API_BASE}/api/v1/me/grids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ numbers: grid.numbers, chance: grid.chance, method: grid.method }),
      });
      if (!response.ok) throw new Error();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }

  const active = METHODS.find((m) => m.code === method)!;

  return (
    <div>
      <div className="mb-9 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {METHODS.map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => setMethod(item.code)}
            className={`rounded-2xl border px-3 py-3.5 font-sora text-sm font-bold transition ${
              method === item.code
                ? 'border-gold/50 bg-gradient-to-br from-gold-light to-gold text-[#5A3F00]'
                : 'border-night/10 bg-white text-[#495064] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-[28px] border border-gold/30 bg-white p-7 shadow-[0_20px_50px_rgba(13,27,42,0.08)] sm:p-11 dark:border-gold/20 dark:bg-slate-900">
        <div className="mb-6 flex flex-wrap items-end justify-center gap-3 text-sm">
          <label>
            <span className="mb-1 block text-xs text-[#6B7280] dark:text-slate-400">Nombre de grilles</span>
            <select
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              className="rounded-lg border border-night/15 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-[#6B7280] dark:text-slate-400">Graine (optionnel)</span>
            <input
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              inputMode="numeric"
              placeholder="ex. 42"
              className="w-28 rounded-lg border border-night/15 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          {method === 'sum_controlled' && (
            <>
              <label>
                <span className="mb-1 block text-xs text-[#6B7280] dark:text-slate-400">Somme min. (100)</span>
                <input
                  value={sumMin}
                  onChange={(event) => setSumMin(event.target.value)}
                  inputMode="numeric"
                  placeholder="100"
                  className="w-24 rounded-lg border border-night/15 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </label>
              <label>
                <span className="mb-1 block text-xs text-[#6B7280] dark:text-slate-400">Somme max. (150)</span>
                <input
                  value={sumMax}
                  onChange={(event) => setSumMax(event.target.value)}
                  inputMode="numeric"
                  placeholder="150"
                  className="w-24 rounded-lg border border-night/15 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </label>
            </>
          )}
        </div>

        {loading ? (
          <div className="mb-6 flex flex-wrap justify-center gap-3.5" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[60px] w-[60px] animate-pulse rounded-full bg-night/10 dark:bg-white/10" />
            ))}
          </div>
        ) : (
          grids.slice(0, 1).map((grid, index) => (
            <div key={index} className="mb-6 flex flex-wrap justify-center gap-3.5">
              {grid.numbers.map((n) => (
                <div
                  key={`${index}-${n}`}
                  className="animate-pop-in flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_28%,#fff8dd,#F4C430_60%,#A8790E_100%)] font-sora text-xl font-extrabold text-night shadow-[0_6px_18px_rgba(244,196,48,0.45)]"
                >
                  {n}
                </div>
              ))}
              <div className="w-5" />
              <div className="animate-pop-in flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_28%,#fff0f6,#FF7BAA_60%,#C81C63_100%)] font-sora text-xl font-extrabold text-[#4A0A26] shadow-[0_6px_18px_rgba(255,77,141,0.45)]">
                {grid.chance}
              </div>
            </div>
          ))
        )}
        {!loading && grids.length === 0 && (
          <div className="mb-6 flex flex-wrap justify-center gap-3.5" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-dashed border-[#C7CEDA] text-[#AAB2C0]"
              >
                —
              </div>
            ))}
          </div>
        )}

        <p className="mx-auto mb-7 max-w-lg text-center text-sm leading-relaxed text-[#6B7280] dark:text-slate-400">
          {active.explanation}
        </p>

        {error && <p className="mb-4 rounded-lg bg-brand-pink/10 p-3 text-center text-sm">{error}</p>}
        {localFallback && grids.length > 0 && (
          <p className="mb-4 rounded-lg bg-gold/15 p-3 text-center text-xs opacity-80">
            Génération calculée directement dans votre navigateur (API indisponible pour le moment)
            — même logique, mêmes garanties statistiques.
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-3.5">
          <button
            onClick={generate}
            disabled={loading}
            className="rounded-2xl bg-gradient-to-br from-gold-light via-gold to-gold-dark px-8 py-4 font-sora text-base font-bold text-night shadow-[0_8px_30px_rgba(244,196,48,0.45)] transition hover:brightness-105 disabled:opacity-50"
          >
            {loading ? 'Génération…' : count > 1 ? `Générer ${count} grilles` : 'Générer'}
          </button>
          {grids.length > 0 &&
            (signedIn ? (
              <button
                onClick={() => saveGrid(grids[0])}
                disabled={saveState === 'saving' || saveState === 'saved'}
                className="rounded-2xl border border-night/15 bg-night/[0.03] px-7 py-4 font-sora text-base font-bold text-night disabled:opacity-60 dark:border-white/20 dark:bg-white/5 dark:text-white"
              >
                {saveState === 'saved' ? 'Grille enregistrée ✓' : saveState === 'saving' ? 'Enregistrement…' : 'Enregistrer cette grille'}
              </button>
            ) : (
              <a
                href="/connexion"
                className="rounded-2xl border border-night/15 bg-night/[0.03] px-7 py-4 font-sora text-base font-bold text-night dark:border-white/20 dark:bg-white/5 dark:text-white"
              >
                Se connecter pour enregistrer
              </a>
            ))}
        </div>
        {saveState === 'error' && (
          <p className="mt-3 text-center text-xs text-brand-pink">Enregistrement impossible pour le moment.</p>
        )}

        {grids.length > 1 && (
          <div className="mt-8 space-y-3 border-t border-night/10 pt-6 dark:border-white/10">
            <p className="text-center text-xs text-[#6B7280] dark:text-slate-400">Grilles suivantes du lot :</p>
            {grids.slice(1).map((grid, index) => (
              <div key={index} className="flex flex-wrap justify-center gap-2 text-sm">
                {grid.numbers.map((n) => (
                  <span key={n} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold/20 font-semibold">
                    {n}
                  </span>
                ))}
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-pink/20 font-semibold">
                  {grid.chance}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
