'use client';

import { useState } from 'react';

import { AdminCard, AdminMessage, formatTs, StatusBadge, useAdminData } from '@/components/admin';
import { adminFetch } from '@/lib/adminApi';

interface Dashboard {
  latest_draw_date: string | null;
  last_import: {
    id: number; status: string; source: string; created_at: string;
    draws_imported: number; draws_quarantined: number; error: string | null;
  } | null;
  pending_quarantine: number;
  next_scheduled_runs: { job_id: string; next_run: string | null }[];
  database_healthy: boolean;
}

export default function AdminDashboardPage() {
  const { data, error, loading, reload } = useAdminData<Dashboard>('/api/v1/admin/dashboard');
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function syncNow() {
    setSyncing(true);
    setMessage(null);
    setSyncError(null);
    try {
      const result = await adminFetch<{ status: string; imported: number }>(
        '/api/v1/admin/sync',
        { method: 'POST' },
      );
      if (result.status === 'failed') {
        setSyncError(
          'Synchronisation en échec — vérifiez la configuration des sources (COLLECTOR_HISTORY_URLS) et les journaux.',
        );
      } else {
        setMessage(`Synchronisation ${result.status} : ${result.imported} tirage(s) importé(s).`);
      }
      await reload();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Erreur inattendue');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Tableau de bord</h1>
        <button
          onClick={syncNow}
          disabled={syncing}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-night disabled:opacity-50"
        >
          {syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
        </button>
      </div>
      <AdminMessage error={error ?? syncError} info={message} />
      {loading && <p className="text-sm opacity-70">Chargement…</p>}
      {data && (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <Tile label="Dernier tirage" value={data.latest_draw_date ?? 'aucun'} />
            <Tile label="Quarantaine en attente" value={String(data.pending_quarantine)} />
            <Tile label="Base de données" value={data.database_healthy ? 'OK' : 'INDISPONIBLE'} />
            <Tile
              label="Prochain contrôle"
              value={
                data.next_scheduled_runs.length > 0
                  ? formatTs(data.next_scheduled_runs[0].next_run)
                  : 'planificateur inactif'
              }
            />
          </div>
          <AdminCard title="Dernier import">
            {data.last_import ? (
              <div className="space-y-1 text-sm">
                <p>
                  <StatusBadge status={data.last_import.status} /> — source :{' '}
                  {data.last_import.source} — {formatTs(data.last_import.created_at)}
                </p>
                <p>
                  {data.last_import.draws_imported} importé(s),{' '}
                  {data.last_import.draws_quarantined} en quarantaine.
                </p>
                {data.last_import.error && (
                  <p className="text-brand-pink">{data.last_import.error}</p>
                )}
              </div>
            ) : (
              <p className="text-sm opacity-70">Aucun import pour le moment.</p>
            )}
          </AdminCard>
          <AdminCard title="Tâches planifiées">
            {data.next_scheduled_runs.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {data.next_scheduled_runs.map((job) => (
                  <li key={job.job_id}>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{job.job_id}</code>{' '}
                    → {formatTs(job.next_run)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-70">
                Planificateur désactivé sur cette instance (SCHEDULER_ENABLED=false).
              </p>
            )}
          </AdminCard>
        </>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs opacity-70">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
