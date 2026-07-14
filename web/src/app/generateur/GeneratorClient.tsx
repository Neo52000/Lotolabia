'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

const METHODS = [
  { code: 'random', label: 'Aléatoire pur' },
  { code: 'frequency', label: 'Pondération par fréquence' },
];

interface Grid {
  numbers: number[];
  chance: number;
  method_label: string;
  warning: string;
}

export default function GeneratorClient() {
  const [method, setMethod] = useState('random');
  const [seed, setSeed] = useState('');
  const [grids, setGrids] = useState<Grid[]>([]);
  const [warning, setWarning] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v1/generator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          count: 1,
          ...(seed.trim() !== '' && Number.isInteger(Number(seed)) ? { seed: Number(seed) } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message ?? 'Génération impossible pour le moment.');
      }
      setGrids(data.grids);
      setWarning(data.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.');
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
            onChange={(event) => setMethod(event.target.value)}
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
          <span className="mb-1 block opacity-70">Graine (optionnel)</span>
          <input
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            inputMode="numeric"
            placeholder="ex. 42"
            className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-night hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Génération…' : 'Générer une grille'}
        </button>
      </div>

      {error && <p className="rounded-lg bg-brand-pink/10 p-3 text-sm">{error}</p>}

      {grids.map((grid, index) => (
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
      {warning && grids.length === 0 && <p className="text-sm opacity-70">{warning}</p>}
    </div>
  );
}
