'use client';

import { useState } from 'react';

import { AdminCard, AdminMessage, useAdminData } from '@/components/admin';
import { adminFetch } from '@/lib/adminApi';

interface Draw {
  id: number;
  draw_date: string;
  numbers: number[];
  chance: number;
  source: string;
}

interface DrawPage {
  items: Draw[];
  total: number;
}

export default function AdminDrawsPage() {
  const { data, error, loading, reload } = useAdminData<DrawPage>(
    '/api/v1/draws?page=1&page_size=30',
  );
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [numbers, setNumbers] = useState('');
  const [chance, setChance] = useState('');

  async function createDraw(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setActionError(null);
    try {
      const parsed = numbers.split(',').map((part) => Number(part.trim()));
      await adminFetch('/api/v1/admin/draws', {
        method: 'POST',
        body: { draw_date: date, numbers: parsed, chance: Number(chance) },
      });
      setMessage(`Tirage du ${date} ajouté.`);
      setDate('');
      setNumbers('');
      setChance('');
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur inattendue');
    }
  }

  async function deleteDraw(id: number, drawDate: string) {
    if (!window.confirm(`Supprimer définitivement le tirage du ${drawDate} ?`)) return;
    setMessage(null);
    setActionError(null);
    try {
      await adminFetch(`/api/v1/admin/draws/${id}`, { method: 'DELETE' });
      setMessage(`Tirage du ${drawDate} supprimé (action journalisée).`);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur inattendue');
    }
  }

  async function recalculate() {
    setMessage(null);
    setActionError(null);
    try {
      await adminFetch('/api/v1/admin/recalculate', { method: 'POST' });
      setMessage('Caches vidés : toutes les statistiques seront recalculées.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur inattendue');
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Gestion des tirages</h1>
        <button
          onClick={recalculate}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
        >
          Recalcul global
        </button>
      </div>
      <AdminMessage error={error ?? actionError} info={message} />

      <AdminCard title="Ajouter un tirage manuellement">
        <form onSubmit={createDraw} className="flex flex-wrap items-end gap-3 text-sm">
          <label>
            <span className="mb-1 block text-xs opacity-70">Date</span>
            <input
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs opacity-70">5 numéros (ex. 3,12,24,37,48)</span>
            <input
              required
              value={numbers}
              onChange={(event) => setNumbers(event.target.value)}
              className="w-52 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs opacity-70">Chance</span>
            <input
              type="number"
              required
              min={1}
              max={10}
              value={chance}
              onChange={(event) => setChance(event.target.value)}
              className="w-20 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <button type="submit" className="rounded-xl bg-brand px-4 py-2 font-semibold text-night">
            Ajouter
          </button>
        </form>
        <p className="mt-2 text-xs opacity-60">
          À n&apos;utiliser qu&apos;avec les valeurs officielles publiées. L&apos;action est journalisée.
        </p>
      </AdminCard>

      <AdminCard title={`Derniers tirages (${data?.total ?? 0} au total)`}>
        {data && data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Numéros</th>
                  <th className="py-2 pr-3">Chance</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((draw) => (
                  <tr key={draw.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-3">{draw.draw_date}</td>
                    <td className="py-1.5 pr-3 font-semibold">{draw.numbers.join(' - ')}</td>
                    <td className="py-1.5 pr-3">{draw.chance}</td>
                    <td className="py-1.5 pr-3 text-xs opacity-70">{draw.source}</td>
                    <td className="py-1.5">
                      <button
                        onClick={() => deleteDraw(draw.id, draw.draw_date)}
                        className="text-xs text-brand-pink hover:underline"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm opacity-70">{loading ? 'Chargement…' : 'Aucun tirage en base.'}</p>
        )}
      </AdminCard>
    </div>
  );
}
