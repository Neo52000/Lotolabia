'use client';

import { useState } from 'react';

import { simulateRandomPlay } from '@/lib/monteCarloFallback';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

interface Distribution {
  matching_numbers: number;
  chance_matched: boolean;
  count: number;
  ratio: number;
}

export default function SimulationClient() {
  const [result, setResult] = useState<{ iterations: number; distribution: Distribution[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localFallback, setLocalFallback] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v1/stats/monte-carlo?iterations=1000`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? 'Simulation indisponible.');
      setResult(data);
      setLocalFallback(false);
    } catch {
      // API indisponible (pas encore hébergée) : simulation calculée localement.
      setResult(simulateRandomPlay(1000));
      setLocalFallback(true);
    } finally {
      setLoading(false);
    }
  }

  const rows = result
    ? result.distribution
        .filter((row) => !row.chance_matched)
        .sort((a, b) => a.matching_numbers - b.matching_numbers)
    : [];

  return (
    <div className="space-y-4">
      <button
        onClick={run}
        disabled={loading}
        className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-night hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Simulation…' : 'Lancer 1 000 grilles aléatoires'}
      </button>
      {error && <p className="rounded-lg bg-brand-pink/10 p-3 text-sm">{error}</p>}
      {localFallback && result && (
        <p className="rounded-lg bg-brand-yellow/15 p-3 text-xs opacity-80">
          Simulation calculée directement dans votre navigateur (API indisponible pour le
          moment) — même logique, mêmes garanties statistiques.
        </p>
      )}
      {loading && (
        <div className="animate-pulse space-y-1.5" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-6 rounded bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      )}
      {!loading && result && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                <th className="py-2 pr-4">Bons numéros</th>
                <th className="py-2 pr-4">Grilles</th>
                <th className="py-2">Proportion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.matching_numbers} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-4 font-semibold">{row.matching_numbers}</td>
                  <td className="py-1.5 pr-4">{row.count}</td>
                  <td className="py-1.5">{(row.ratio * 100).toFixed(2)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs opacity-70">
            La grande majorité des grilles ne retrouvent aucun ou un seul numéro — conforme aux
            probabilités théoriques du jeu.
          </p>
        </div>
      )}
    </div>
  );
}
