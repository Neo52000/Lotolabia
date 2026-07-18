'use client';

import { useCallback, useEffect, useState } from 'react';

import { adminFetch, AdminApiError } from '@/lib/adminApi';

/** Hook générique de chargement d'une ressource admin. */
export function useAdminData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminFetch<T>(path));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue');
      if (err instanceof AdminApiError && err.status === 403) {
        setError('Accès refusé : ce compte ne dispose pas du rôle administrateur.');
      }
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}

export function AdminCard({ title, children, actions }: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: 'bg-brand-green/15 text-brand-green',
    partial: 'bg-brand-yellow/20 text-yellow-700 dark:text-brand-yellow',
    failed: 'bg-brand-pink/15 text-brand-pink',
    running: 'bg-brand/15 text-brand',
    pending: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    approved: 'bg-brand-green/15 text-brand-green',
    rejected: 'bg-brand-pink/15 text-brand-pink',
    active: 'bg-brand-green/15 text-brand-green',
    revoked: 'bg-brand-pink/15 text-brand-pink',
    expired: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    refunded: 'bg-brand-pink/15 text-brand-pink',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[status] ?? 'bg-slate-200 dark:bg-slate-700'}`}>
      {status}
    </span>
  );
}

export function AdminMessage({ error, info }: { error?: string | null; info?: string | null }) {
  if (error) return <p className="mb-4 rounded-lg bg-brand-pink/10 p-3 text-sm">{error}</p>;
  if (info) return <p className="mb-4 rounded-lg bg-brand-green/10 p-3 text-sm">{info}</p>;
  return null;
}

export function formatTs(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR');
}
