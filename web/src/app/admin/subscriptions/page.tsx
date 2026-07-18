'use client';

import { useMemo, useState } from 'react';

import { AdminCard, AdminMessage, formatTs, StatusBadge, useAdminData } from '@/components/admin';
import { adminFetch } from '@/lib/adminApi';

interface Entitlement {
  id: number;
  user_id: string;
  product: string;
  platform: string;
  status: string;
  started_at: string | null;
  expires_at: string | null;
  receipt_ref: string | null;
  created_at: string;
}

const STATUSES = ['active', 'expired', 'revoked', 'refunded'] as const;
const PRODUCTS = ['monthly', 'yearly', 'lifetime', 'trial'] as const;
const PLATFORMS = ['google_play', 'app_store', 'stripe', 'manual'] as const;

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const days = (new Date(expiresAt).getTime() - Date.now()) / 86_400_000;
  return days >= 0 && days <= 7;
}

export default function AdminSubscriptionsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');

  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (productFilter) params.set('product', productFilter);
    if (platformFilter) params.set('platform', platformFilter);
    if (userIdFilter.trim()) params.set('user_id', userIdFilter.trim());
    const qs = params.toString();
    return `/api/v1/admin/premium${qs ? `?${qs}` : ''}`;
  }, [statusFilter, productFilter, platformFilter, userIdFilter]);

  const { data, error, loading, reload } = useAdminData<Entitlement[]>(path);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editExpiry, setEditExpiry] = useState('');

  const [grantUserId, setGrantUserId] = useState('');
  const [grantProduct, setGrantProduct] = useState<(typeof PRODUCTS)[number]>('yearly');
  const [granting, setGranting] = useState(false);

  const summary = useMemo(() => {
    const items = data ?? [];
    return {
      total: items.length,
      active: items.filter((e) => e.status === 'active').length,
      expiringSoon: items.filter((e) => e.status === 'active' && isExpiringSoon(e.expires_at)).length,
      revoked: items.filter((e) => e.status === 'revoked' || e.status === 'refunded').length,
    };
  }, [data]);

  async function revoke(id: number) {
    setMessage(null);
    setActionError(null);
    try {
      await adminFetch(`/api/v1/admin/premium/${id}`, { method: 'DELETE' });
      setMessage('Abonnement révoqué.');
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur inattendue');
    }
  }

  async function saveExpiry(id: number) {
    setMessage(null);
    setActionError(null);
    try {
      await adminFetch(`/api/v1/admin/premium/${id}`, {
        method: 'PATCH',
        body: { expires_at: editExpiry ? new Date(editExpiry).toISOString() : null },
      });
      setMessage('Date d’expiration mise à jour.');
      setEditingId(null);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur inattendue');
    }
  }

  async function grant(event: React.FormEvent) {
    event.preventDefault();
    if (!grantUserId.trim()) return;
    setGranting(true);
    setMessage(null);
    setActionError(null);
    try {
      await adminFetch('/api/v1/admin/premium/grant', {
        method: 'POST',
        body: { user_id: grantUserId.trim(), product: grantProduct, expires_at: null },
      });
      setMessage('Abonnement accordé manuellement.');
      setGrantUserId('');
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur inattendue');
    } finally {
      setGranting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Abonnements</h1>
      <AdminMessage error={error ?? actionError} info={message} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Tile label="Abonnements (filtre courant)" value={String(summary.total)} />
        <Tile label="Actifs" value={String(summary.active)} />
        <Tile label="Expirent sous 7 jours" value={String(summary.expiringSoon)} />
        <Tile label="Révoqués / remboursés" value={String(summary.revoked)} />
      </div>

      <AdminCard title="Accorder un abonnement manuellement">
        <form onSubmit={grant} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block opacity-70">Identifiant utilisateur (UUID)</span>
            <input
              value={grantUserId}
              onChange={(event) => setGrantUserId(event.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              required
              className="w-72 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block opacity-70">Offre</span>
            <select
              value={grantProduct}
              onChange={(event) => setGrantProduct(event.target.value as (typeof PRODUCTS)[number])}
              className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            >
              {PRODUCTS.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={granting}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-night disabled:opacity-50"
          >
            {granting ? 'Envoi…' : 'Accorder'}
          </button>
        </form>
        <p className="mt-2 text-xs opacity-60">
          Réservé au support (ex. geste commercial). Les achats via Stripe et les stores mobiles
          synchronisent cette table automatiquement via webhooks.
        </p>
      </AdminCard>

      <AdminCard
        title={`Abonnements (${data?.length ?? 0})`}
        actions={
          <button onClick={() => reload()} className="text-sm text-brand hover:underline">
            Recharger
          </button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800"
          >
            <option value="">Tous statuts</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800"
          >
            <option value="">Toutes les offres</option>
            {PRODUCTS.map((product) => (
              <option key={product} value={product}>
                {product}
              </option>
            ))}
          </select>
          <select
            value={platformFilter}
            onChange={(event) => setPlatformFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800"
          >
            <option value="">Toutes les plateformes</option>
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
          <input
            value={userIdFilter}
            onChange={(event) => setUserIdFilter(event.target.value)}
            placeholder="Filtrer par identifiant utilisateur"
            className="min-w-[16rem] rounded-lg border border-slate-300 px-3 py-1.5 dark:border-slate-600 dark:bg-slate-800"
          />
        </div>

        {data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                  <th className="py-2 pr-3">Utilisateur</th>
                  <th className="py-2 pr-3">Offre</th>
                  <th className="py-2 pr-3">Plateforme</th>
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2 pr-3">Débuté le</th>
                  <th className="py-2 pr-3">Expire le</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entitlement) => (
                  <tr key={entitlement.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-3 font-mono text-xs">{entitlement.user_id.slice(0, 8)}…</td>
                    <td className="py-1.5 pr-3">{entitlement.product}</td>
                    <td className="py-1.5 pr-3">{entitlement.platform}</td>
                    <td className="py-1.5 pr-3">
                      <StatusBadge status={entitlement.status} />
                    </td>
                    <td className="py-1.5 pr-3">{formatTs(entitlement.started_at)}</td>
                    <td className="py-1.5 pr-3">
                      {editingId === entitlement.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={editExpiry}
                            onChange={(event) => setEditExpiry(event.target.value)}
                            className="rounded border border-slate-300 px-1.5 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                          />
                          <button
                            onClick={() => saveExpiry(entitlement.id)}
                            className="text-xs text-brand-green hover:underline"
                          >
                            Enregistrer
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs opacity-60 hover:underline"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(entitlement.id);
                            setEditExpiry(entitlement.expires_at ? entitlement.expires_at.slice(0, 10) : '');
                          }}
                          className={`hover:underline ${isExpiringSoon(entitlement.expires_at) ? 'text-brand-yellow' : ''}`}
                        >
                          {entitlement.expires_at ? formatTs(entitlement.expires_at) : 'jamais'}
                        </button>
                      )}
                    </td>
                    <td className="space-x-2 py-1.5 text-xs">
                      {entitlement.status === 'active' && (
                        <button
                          onClick={() => revoke(entitlement.id)}
                          className="text-brand-pink hover:underline"
                        >
                          Révoquer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm opacity-70">
            {loading ? 'Chargement…' : 'Aucun abonnement pour ces filtres.'}
          </p>
        )}
      </AdminCard>
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
