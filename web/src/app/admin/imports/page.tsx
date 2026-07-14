'use client';

import { useState } from 'react';

import { AdminCard, AdminMessage, formatTs, StatusBadge, useAdminData } from '@/components/admin';
import { adminFetch } from '@/lib/adminApi';

interface ImportJob {
  id: number;
  source: string;
  source_url: string | null;
  status: string;
  triggered_by: string;
  created_at: string;
  draws_imported: number;
  draws_skipped: number;
  draws_quarantined: number;
  error: string | null;
}

interface SyncLog {
  id: number;
  job_id: number | null;
  level: string;
  message: string;
  created_at: string;
}

export default function AdminImportsPage() {
  const jobs = useAdminData<ImportJob[]>('/api/v1/admin/imports');
  const logs = useAdminData<SyncLog[]>('/api/v1/admin/logs?limit=100');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    setMessage(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await adminFetch<{ imported: number; quarantined: number; status: string }>(
        '/api/v1/admin/import/manual',
        { method: 'POST', formData },
      );
      setMessage(
        `Import ${result.status} : ${result.imported} tirage(s) importé(s), ${result.quarantined} en quarantaine.`,
      );
      await jobs.reload();
      await logs.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Imports</h1>
      <AdminMessage error={error ?? jobs.error} info={message} />

      <AdminCard title="Import manuel de secours (.csv ou .zip, 5 Mo max)">
        <form onSubmit={upload} className="flex flex-wrap items-center gap-3 text-sm">
          <input
            type="file"
            accept=".csv,.zip"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            type="submit"
            disabled={!file || uploading}
            className="rounded-xl bg-brand px-4 py-2 font-semibold text-night disabled:opacity-50"
          >
            {uploading ? 'Import…' : 'Importer'}
          </button>
          <span className="opacity-70">
            Colonnes acceptées : date,n1..n5,chance ou format historique officiel.
          </span>
        </form>
      </AdminCard>

      <AdminCard title="Historique des imports">
        {jobs.data && jobs.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Déclencheur</th>
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2 pr-3">Importés</th>
                  <th className="py-2 pr-3">Doublons</th>
                  <th className="py-2 pr-3">Quarantaine</th>
                  <th className="py-2">Erreur</th>
                </tr>
              </thead>
              <tbody>
                {jobs.data.map((job) => (
                  <tr key={job.id} className="border-b border-slate-100 align-top dark:border-slate-800">
                    <td className="py-1.5 pr-3">{job.id}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{formatTs(job.created_at)}</td>
                    <td className="py-1.5 pr-3">{job.source}</td>
                    <td className="py-1.5 pr-3">{job.triggered_by}</td>
                    <td className="py-1.5 pr-3"><StatusBadge status={job.status} /></td>
                    <td className="py-1.5 pr-3">{job.draws_imported}</td>
                    <td className="py-1.5 pr-3">{job.draws_skipped}</td>
                    <td className="py-1.5 pr-3">{job.draws_quarantined}</td>
                    <td className="max-w-56 py-1.5 text-xs text-brand-pink">{job.error ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm opacity-70">{jobs.loading ? 'Chargement…' : 'Aucun import.'}</p>
        )}
      </AdminCard>

      <AdminCard title="Journal des synchronisations">
        {logs.data && logs.data.length > 0 ? (
          <ul className="max-h-96 space-y-1 overflow-y-auto text-xs">
            {logs.data.map((log) => (
              <li key={log.id} className="flex gap-2">
                <span className="whitespace-nowrap opacity-60">{formatTs(log.created_at)}</span>
                <StatusBadge status={log.level === 'error' ? 'failed' : log.level === 'warning' ? 'partial' : 'success'} />
                <span>{log.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-70">{logs.loading ? 'Chargement…' : 'Aucun journal.'}</p>
        )}
      </AdminCard>
    </div>
  );
}
