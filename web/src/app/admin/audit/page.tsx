'use client';

import { AdminCard, formatTs, StatusBadge, useAdminData } from '@/components/admin';

interface AuditEntry {
  id: number;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
}

interface SystemStatus {
  environment: string;
  version: string;
  database: string;
  supabase_configured: boolean;
  scheduler_enabled: boolean;
  scheduler_jobs: { job_id: string; next_run: string | null }[];
  collector_sources_configured: number;
  backups: string;
}

export default function AdminAuditPage() {
  const audit = useAdminData<AuditEntry[]>('/api/v1/admin/audit?limit=200');
  const status = useAdminData<SystemStatus>('/api/v1/admin/status');

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Audit & état du système</h1>

      <AdminCard title="État du système">
        {status.data ? (
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <Item label="Environnement" value={status.data.environment} />
            <Item label="Version API" value={status.data.version} />
            <Item label="Base de données" value={status.data.database} ok={status.data.database === 'ok'} />
            <Item label="Supabase configuré" value={status.data.supabase_configured ? 'oui' : 'non'} ok={status.data.supabase_configured} />
            <Item label="Planificateur" value={status.data.scheduler_enabled ? 'actif' : 'inactif'} />
            <Item label="Sources collecteur" value={`${status.data.collector_sources_configured} configurée(s)`} ok={status.data.collector_sources_configured > 0} />
            <div className="md:col-span-2">
              <p className="text-xs opacity-70">Sauvegardes</p>
              <p>{status.data.backups}</p>
            </div>
          </dl>
        ) : (
          <p className="text-sm opacity-70">{status.loading ? 'Chargement…' : status.error}</p>
        )}
      </AdminCard>

      <AdminCard title="Journal d'audit (actions sensibles)">
        {audit.data && audit.data.length > 0 ? (
          <ul className="max-h-[32rem] space-y-1 overflow-y-auto text-sm">
            {audit.data.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-2">
                <span className="whitespace-nowrap text-xs opacity-60">{formatTs(entry.created_at)}</span>
                <StatusBadge status="pending" />
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{entry.action}</code>
                <span className="text-xs opacity-70">
                  {entry.actor_email ?? 'système'}
                  {entry.target_type ? ` → ${entry.target_type} ${entry.target_id ?? ''}` : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-70">
            {audit.loading ? 'Chargement…' : 'Aucune action journalisée.'}
          </p>
        )}
      </AdminCard>
    </div>
  );
}

function Item({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div>
      <p className="text-xs opacity-70">{label}</p>
      <p className={`font-semibold ${ok === false ? 'text-brand-pink' : ok ? 'text-brand-green' : ''}`}>
        {value}
      </p>
    </div>
  );
}
