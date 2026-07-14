'use client';

import { useState } from 'react';

import { AdminCard, AdminMessage, StatusBadge, useAdminData } from '@/components/admin';
import { adminFetch } from '@/lib/adminApi';

interface AdPlacement {
  code: string;
  name: string;
  enabled: boolean;
  network: string;
  unit_id: string | null;
  max_per_session: number;
}

export default function AdminAdsPage() {
  const { data, error, loading, reload } = useAdminData<AdPlacement[]>('/api/v1/admin/ads');
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unitId, setUnitId] = useState('');

  async function upsert(placement: Partial<AdPlacement> & { code: string; name: string }) {
    setMessage(null);
    setActionError(null);
    try {
      await adminFetch('/api/v1/admin/ads', {
        method: 'PUT',
        body: {
          code: placement.code,
          name: placement.name,
          enabled: placement.enabled ?? false,
          network: placement.network ?? 'admob',
          unit_id: placement.unit_id ?? null,
          max_per_session: placement.max_per_session ?? 1,
        },
      });
      setMessage(`Emplacement « ${placement.code} » enregistré.`);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur inattendue');
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Emplacements publicitaires</h1>
      <p className="mb-4 max-w-3xl text-sm opacity-80">
        Tous les emplacements sont <strong>désactivés par défaut</strong>. Ils ne s&apos;activent
        qu&apos;ici, une fois les identifiants AdMob configurés, et restent plafonnés par session.
        Publicités discrètes uniquement, jamais sur les écrans de jeu responsable.
      </p>
      <AdminMessage error={error ?? actionError} info={message} />

      <AdminCard title="Créer un emplacement">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void upsert({ code, name, unit_id: unitId || null });
            setCode('');
            setName('');
            setUnitId('');
          }}
          className="flex flex-wrap items-end gap-3 text-sm"
        >
          <input
            required
            pattern="[a-z0-9_]+"
            placeholder="code_emplacement"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
          <input
            required
            placeholder="Nom lisible"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
          <input
            placeholder="ID d'unité AdMob (optionnel)"
            value={unitId}
            onChange={(event) => setUnitId(event.target.value)}
            className="w-64 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
          <button type="submit" className="rounded-xl bg-brand px-4 py-2 font-semibold text-night">
            Créer
          </button>
        </form>
      </AdminCard>

      <AdminCard title={`Emplacements (${data?.length ?? 0})`}>
        {data && data.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {data.map((placement) => (
              <li key={placement.code} className="flex flex-wrap items-center gap-3">
                <StatusBadge status={placement.enabled ? 'active' : 'pending'} />
                <span className="font-mono text-xs">{placement.code}</span>
                <span className="flex-1">{placement.name}</span>
                <span className="text-xs opacity-60">
                  {placement.unit_id ? `unité : ${placement.unit_id}` : 'unité non configurée'} ·
                  max {placement.max_per_session}/session
                </span>
                <button
                  onClick={() => upsert({ ...placement, enabled: !placement.enabled })}
                  className={`text-xs hover:underline ${placement.enabled ? 'text-brand-pink' : 'text-brand-green'}`}
                >
                  {placement.enabled ? 'Désactiver' : 'Activer'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-70">{loading ? 'Chargement…' : 'Aucun emplacement.'}</p>
        )}
      </AdminCard>
    </div>
  );
}
