'use client';

import { useState } from 'react';

import { AdminCard, AdminMessage, formatTs, useAdminData } from '@/components/admin';
import { adminFetch } from '@/lib/adminApi';

interface QuarantineItem {
  id: number;
  job_id: number | null;
  raw_data: Record<string, string>;
  reason: string;
  created_at: string;
}

export default function AdminQuarantinePage() {
  const { data, error, loading, reload } = useAdminData<QuarantineItem[]>(
    '/api/v1/admin/quarantine',
  );
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function review(id: number, action: 'approve' | 'reject') {
    setMessage(null);
    setActionError(null);
    try {
      await adminFetch(`/api/v1/admin/quarantine/${id}/${action}`, { method: 'POST' });
      setMessage(action === 'approve' ? 'Ligne validée et importée.' : 'Ligne rejetée.');
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur inattendue');
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Quarantaine</h1>
      <p className="mb-4 max-w-3xl text-sm opacity-80">
        Lignes rejetées à l&apos;import (numéros hors plage, doublons internes, dates
        incohérentes…). Validez uniquement après vérification contre la source officielle —
        la validation ré-exécute toutes les règles de contrôle.
      </p>
      <AdminMessage error={error ?? actionError} info={message} />
      <AdminCard title={`En attente (${data?.length ?? 0})`}>
        {data && data.length > 0 ? (
          <ul className="space-y-4">
            {data.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
                <p className="mb-1 font-semibold text-brand-pink">{item.reason}</p>
                <p className="mb-2 text-xs opacity-60">
                  Job #{item.job_id ?? '—'} — {formatTs(item.created_at)}
                </p>
                <pre className="mb-3 overflow-x-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">
                  {JSON.stringify(item.raw_data, null, 2)}
                </pre>
                <div className="flex gap-2">
                  <button
                    onClick={() => review(item.id, 'approve')}
                    className="rounded-lg bg-brand-green/90 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Valider et importer
                  </button>
                  <button
                    onClick={() => review(item.id, 'reject')}
                    className="rounded-lg bg-brand-pink/90 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Rejeter
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-70">
            {loading ? 'Chargement…' : 'Aucune donnée en quarantaine. 👍'}
          </p>
        )}
      </AdminCard>
    </div>
  );
}
