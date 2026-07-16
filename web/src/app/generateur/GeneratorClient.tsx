'use client';

import { useState } from 'react';

import { generateGrids, type GeneratorMethod } from '@/lib/generatorFallback';
import { supabaseAllDraws } from '@/lib/supabasePublic';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

const METHODS: { code: GeneratorMethod; label: string }[] = [
  { code: 'random', label: 'Aléatoire pur' },
  { code: 'frequency', label: 'Pondération par fréquence' },
  { code: 'delay', label: 'Pondération par retard' },
  { code: 'balanced', label: 'Équilibrage pair/impair et bas/haut' },
  { code: 'sum_controlled', label: 'Contrôle de la somme' },
  { code: 'diversified', label: 'Diversification entre grilles' },
];

const METHODS_USING_DRAWS = new Set<GeneratorMethod>(['frequency', 'delay']);

interface Grid {
  numbers: number[];
  chance: number;
  method_label: string;
  warning: string;
}

export default function GeneratorClient() {
  const [method, setMethod] = useState<GeneratorMethod>('random');
  const [seed, setSeed] = useState('');
  const [count, setCount] = useState(1);
  const [sumMin, setSumMin] = useState('');
  const [sumMax, setSumMax] = useState('');
  const [grids, setGrids] = useState<Grid[]>([]);
  const [warning, setWarning] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localFallback, setLocalFallback] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
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
      setWarning(data.warning);
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
        setWarning(localGrids[0]?.warning ?? '');
        setLocalFallback(true);
      } catch (fallbackErr) {
        setError(fallbackErr instanceof Error ? fallbackErr.message : 'Erreur inattendue.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block opacity-70">Méthode</span>
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value as GeneratorMethod)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          >
            {METHODS.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block opacity-70">Nombre de grilles</span>
          <select
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block opacity-70">Graine (optionnel)</span>
          <input
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            inputMode="numeric"
            placeholder="ex. 42"
            className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        {method === 'sum_controlled' && (
          <>
            <label className="text-sm">
              <span className="mb-1 block opacity-70">Somme min. (défaut 100)</span>
              <input
                value={sumMin}
                onChange={(event) => setSumMin(event.target.value)}
                inputMode="numeric"
                placeholder="100"
                className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block opacity-70">Somme max. (défaut 150)</span>
              <input
                value={sumMax}
                onChange={(event) => setSumMax(event.target.value)}
                inputMode="numeric"
                placeholder="150"
                className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              />
            </label>
          </>
        )}
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-night hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Génération…' : count > 1 ? `Générer ${count} grilles` : 'Générer une grille'}
        </button>
      </div>

      {error && <p className="rounded-lg bg-brand-pink/10 p-3 text-sm">{error}</p>}
      {localFallback && grids.length > 0 && (
        <p className="rounded-lg bg-brand-yellow/15 p-3 text-xs opacity-80">
          Génération calculée directement dans votre navigateur (API indisponible pour le
          moment) — même logique, mêmes garanties statistiques.
        </p>
      )}

      {loading && (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: count }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="mb-3 h-3 w-40 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((__, ballIndex) => (
                  <div key={ballIndex} className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-700" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading &&
        grids.map((grid, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-3 text-sm font-semibold">{grid.method_label}</p>
            <p className="flex flex-wrap gap-2">
              {grid.numbers.map((n) => (
                <span key={n} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-violet font-bold text-white">
                  {n}
                </span>
              ))}
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-pink to-brand-violet font-bold text-white">
                {grid.chance}
              </span>
            </p>
            <p className="mt-3 text-xs opacity-70">{grid.warning}</p>
          </div>
        ))}
      {!loading && warning && grids.length === 0 && <p className="text-sm opacity-70">{warning}</p>}
    </div>
  );
}
