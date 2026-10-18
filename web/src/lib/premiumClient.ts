'use client';

import { getAccessToken } from './authClient';

async function postWithToken(path: string, body: unknown): Promise<Record<string, unknown>> {
  const token = await getAccessToken();
  if (!token) throw new Error('Connectez-vous pour continuer.');
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message = (data.error as { message?: string } | undefined)?.message;
    throw new Error(message ?? 'Service de paiement indisponible pour le moment.');
  }
  return data;
}

/** Redirige vers la page de paiement Stripe. */
export async function startCheckout(product: 'monthly' | 'yearly'): Promise<void> {
  const data = await postWithToken('/api/premium/checkout', { product, consent: true });
  window.location.assign(String(data.checkout_url));
}

/** Redirige vers le portail Stripe (gestion / résiliation de l'abonnement). */
export async function openBillingPortal(): Promise<void> {
  const data = await postWithToken('/api/premium/portal', {});
  window.location.assign(String(data.portal_url));
}
