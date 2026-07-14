'use client';

import { useState } from 'react';

import { AdminCard, AdminMessage, formatTs, StatusBadge, useAdminData } from '@/components/admin';
import { adminFetch } from '@/lib/adminApi';

interface Profile {
  id: string;
  display_name: string | null;
  role: string;
  created_at: string;
}

interface Entitlement {
  id: number;
  user_id: string;
  product: string;
  platform: string;
  status: string;
  expires_at: string | null;
}

export default function AdminUsersPage() {
  const users = useAdminData<{ items: Profile[]; total: number }>(
    '/api/v1/admin/users?page=1&page_size=50',
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlement[] | null>(null);

  async function setRole(userId: string, role: string) {
    setMessage(null);
    setError(null);
    try {
      await adminFetch(`/api/v1/admin/users/${userId}/role`, { method: 'PUT', body: { role } });
      setMessage(`Rôle mis à jour (${role}).`);
      await users.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue');
    }
  }

  async function grantPremium(userId: string) {
    setMessage(null);
    setError(null);
    try {
      await adminFetch('/api/v1/admin/premium/grant', {
        method: 'POST',
        body: { user_id: userId, product: 'yearly', expires_at: null },
      });
      setMessage('Droit Premium accordé (manuel, sans expiration).');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue');
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Utilisateurs & Premium</h1>
      <AdminMessage error={error ?? users.error} info={message} />
      <AdminCard title={`Comptes (${users.data?.total ?? 0})`}>
        {users.data && users.data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                  <th className="py-2 pr-3">Identifiant</th>
                  <th className="py-2 pr-3">Nom</th>
                  <th className="py-2 pr-3">Rôle</th>
                  <th className="py-2 pr-3">Créé le</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.data.items.map((profile) => (
                  <tr key={profile.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-3 font-mono text-xs">{profile.id.slice(0, 8)}…</td>
                    <td className="py-1.5 pr-3">{profile.display_name ?? '—'}</td>
                    <td className="py-1.5 pr-3">
                      <StatusBadge status={profile.role === 'admin' ? 'active' : 'pending'} />{' '}
                      {profile.role}
                    </td>
                    <td className="py-1.5 pr-3">{formatTs(profile.created_at)}</td>
                    <td className="space-x-2 py-1.5 text-xs">
                      {profile.role === 'admin' ? (
                        <button onClick={() => setRole(profile.id, 'user')} className="text-brand-pink hover:underline">
                          Retirer admin
                        </button>
                      ) : (
                        <button onClick={() => setRole(profile.id, 'admin')} className="text-brand hover:underline">
                          Promouvoir admin
                        </button>
                      )}
                      <button onClick={() => grantPremium(profile.id)} className="text-brand-green hover:underline">
                        Accorder Premium
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm opacity-70">
            {users.loading ? 'Chargement…' : 'Aucun compte utilisateur pour le moment.'}
          </p>
        )}
      </AdminCard>
      <AdminCard
        title="Droits Premium"
        actions={
          <button
            onClick={async () => {
              try {
                setEntitlements(await adminFetch<Entitlement[]>('/api/v1/admin/premium'));
              } catch {
                setEntitlements([]);
              }
            }}
            className="text-sm text-brand hover:underline"
          >
            Recharger
          </button>
        }
      >
        <p className="mb-3 text-xs opacity-70">
          Les achats via les stores synchroniseront automatiquement cette table
          (webhooks de reçus — voir docs/MONETISATION.md). Les droits manuels servent au support.
        </p>
        {entitlements && entitlements.length > 0 && (
          <ul className="space-y-1 text-sm">
            {entitlements.map((entitlement) => (
              <li key={entitlement.id} className="flex flex-wrap items-center gap-2">
                <StatusBadge status={entitlement.status} />
                <span className="font-mono text-xs">{entitlement.user_id.slice(0, 8)}…</span>
                <span>{entitlement.product} ({entitlement.platform})</span>
                <span className="opacity-60">expire : {entitlement.expires_at ?? 'jamais'}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
