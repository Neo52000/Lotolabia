/**
 * Traitement des événements Stripe — port de `backend/app/api/v1/billing.py`.
 * La signature est vérifiée par la route avant d'arriver ici : ce module ne
 * fait confiance qu'à des événements déjà authentifiés.
 *
 * Un droit Premium n'est accordé qu'une fois le paiement confirmé par Stripe,
 * jamais à la création de la session de paiement.
 */

import type { EntitlementRepo } from './entitlements';

export interface StripeEventLike {
  type: string;
  data: { object: Record<string, unknown> };
}

export type WebhookOutcome = 'granted' | 'already_granted' | 'updated' | 'revoked' | 'ignored';

const KNOWN_PRODUCTS = new Set(['monthly', 'yearly', 'lifetime']);

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

async function grantFromCheckout(session: Record<string, unknown>, repo: EntitlementRepo): Promise<WebhookOutcome> {
  // Paiement différé (ex. prélèvement SEPA) : on attend `async_payment_succeeded`.
  if (session.payment_status === 'unpaid') return 'ignored';

  const metadata = (session.metadata ?? {}) as Record<string, unknown>;
  const userId = asString(session.client_reference_id) ?? asString(metadata.user_id);
  const product = asString(metadata.product);
  if (!userId || !product || !KNOWN_PRODUCTS.has(product)) return 'ignored';

  // Abonnement : l'ID de subscription sert de référence aux événements suivants.
  // Achat unique : l'ID de session suffit, aucun renouvellement à suivre.
  const receiptRef = asString(session.subscription) ?? asString(session.id);
  if (!receiptRef) return 'ignored';

  // Stripe peut renvoyer un même événement plusieurs fois.
  if (await repo.findByReceiptRef(receiptRef)) return 'already_granted';

  await repo.insert({
    user_id: userId,
    product,
    platform: 'stripe',
    status: 'active',
    receipt_ref: receiptRef,
    expires_at: null,
  });
  return 'granted';
}

function periodEnd(subscription: Record<string, unknown>): number | null {
  // Depuis l'API « Basil » (2025-03-31), la période vit sur chaque ligne
  // (`items`) ; avant, sur l'abonnement lui-même.
  const items = ((subscription.items as { data?: Record<string, unknown>[] } | undefined)?.data ?? []);
  const fromItem = items[0]?.current_period_end;
  if (typeof fromItem === 'number') return fromItem;
  return typeof subscription.current_period_end === 'number' ? subscription.current_period_end : null;
}

async function updateFromSubscription(subscription: Record<string, unknown>, repo: EntitlementRepo): Promise<WebhookOutcome> {
  const ref = asString(subscription.id);
  const entitlement = ref ? await repo.findByReceiptRef(ref) : null;
  if (!entitlement) return 'ignored';
  const active = subscription.status === 'active' || subscription.status === 'trialing';
  const end = periodEnd(subscription);
  await repo.update(entitlement.id, {
    status: active ? 'active' : 'revoked',
    expires_at: end ? new Date(end * 1000).toISOString() : null,
  });
  return active ? 'updated' : 'revoked';
}

async function revokeFromSubscription(subscription: Record<string, unknown>, repo: EntitlementRepo): Promise<WebhookOutcome> {
  const ref = asString(subscription.id);
  const entitlement = ref ? await repo.findByReceiptRef(ref) : null;
  if (!entitlement) return 'ignored';
  await repo.update(entitlement.id, { status: 'revoked' });
  return 'revoked';
}

export async function handleStripeEvent(event: StripeEventLike, repo: EntitlementRepo): Promise<WebhookOutcome> {
  const object = event.data.object;
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      return grantFromCheckout(object, repo);
    case 'customer.subscription.updated':
      return updateFromSubscription(object, repo);
    case 'customer.subscription.deleted':
      return revokeFromSubscription(object, repo);
    default:
      return 'ignored';
  }
}
