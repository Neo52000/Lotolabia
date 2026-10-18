import { describe, expect, it } from 'vitest';

import type { EntitlementRepo, NewEntitlement, StoredEntitlement } from './entitlements';
import { handleStripeEvent } from './stripeWebhook';

function fakeRepo(initial: StoredEntitlement[] = []) {
  const rows = [...initial];
  const repo: EntitlementRepo & { rows: StoredEntitlement[] } = {
    rows,
    async findByReceiptRef(ref) {
      return rows.find((row) => row.receipt_ref === ref) ?? null;
    },
    async listForUser(userId) {
      return rows.filter((row) => row.user_id === userId);
    },
    async insert(entitlement: NewEntitlement) {
      rows.push({ id: rows.length + 1, ...entitlement });
    },
    async update(id, fields) {
      Object.assign(rows.find((row) => row.id === id)!, fields);
    },
  };
  return repo;
}

const completed = (overrides: Record<string, unknown> = {}) => ({
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_1',
      payment_status: 'paid',
      client_reference_id: 'user-1',
      subscription: 'sub_123',
      metadata: { user_id: 'user-1', product: 'monthly' },
      ...overrides,
    },
  },
});

const subscriptionRow: StoredEntitlement = {
  id: 1,
  user_id: 'user-1',
  product: 'monthly',
  platform: 'stripe',
  status: 'active',
  receipt_ref: 'sub_123',
  expires_at: null,
};

describe('checkout.session.completed', () => {
  it('accorde un droit Premium actif référencé par l’abonnement', async () => {
    const repo = fakeRepo();
    expect(await handleStripeEvent(completed(), repo)).toBe('granted');
    expect(repo.rows).toEqual([
      expect.objectContaining({ user_id: 'user-1', product: 'monthly', platform: 'stripe', status: 'active', receipt_ref: 'sub_123' }),
    ]);
  });

  it('est idempotent : un événement renvoyé par Stripe ne crée pas de doublon', async () => {
    const repo = fakeRepo();
    await handleStripeEvent(completed(), repo);
    expect(await handleStripeEvent(completed(), repo)).toBe('already_granted');
    expect(repo.rows).toHaveLength(1);
  });

  it('attend la confirmation d’un paiement différé', async () => {
    const repo = fakeRepo();
    expect(await handleStripeEvent(completed({ payment_status: 'unpaid' }), repo)).toBe('ignored');
    const succeeded = { ...completed(), type: 'checkout.session.async_payment_succeeded' };
    expect(await handleStripeEvent(succeeded, repo)).toBe('granted');
  });

  it('ignore une session sans utilisateur ou avec une offre inconnue', async () => {
    const repo = fakeRepo();
    expect(
      await handleStripeEvent(completed({ client_reference_id: null, metadata: { product: 'monthly' } }), repo),
    ).toBe('ignored');
    expect(await handleStripeEvent(completed({ metadata: { user_id: 'user-1', product: 'gratuit' } }), repo)).toBe(
      'ignored',
    );
    expect(repo.rows).toHaveLength(0);
  });
});

describe('cycle de vie de l’abonnement', () => {
  it('renouvellement : met à jour l’échéance (format Basil, sur la ligne d’abonnement)', async () => {
    const repo = fakeRepo([{ ...subscriptionRow }]);
    const event = {
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_123', status: 'active', items: { data: [{ current_period_end: 1_800_000_000 }] } } },
    };
    expect(await handleStripeEvent(event, repo)).toBe('updated');
    expect(repo.rows[0]).toMatchObject({ status: 'active', expires_at: new Date(1_800_000_000_000).toISOString() });
  });

  it('accepte aussi l’ancien format (échéance sur l’abonnement)', async () => {
    const repo = fakeRepo([{ ...subscriptionRow }]);
    const event = {
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_123', status: 'trialing', current_period_end: 1_800_000_000 } },
    };
    expect(await handleStripeEvent(event, repo)).toBe('updated');
    expect(repo.rows[0].expires_at).toBe(new Date(1_800_000_000_000).toISOString());
  });

  it('impayé : retire le droit', async () => {
    const repo = fakeRepo([{ ...subscriptionRow }]);
    const event = { type: 'customer.subscription.updated', data: { object: { id: 'sub_123', status: 'past_due' } } };
    expect(await handleStripeEvent(event, repo)).toBe('revoked');
    expect(repo.rows[0].status).toBe('revoked');
  });

  it('résiliation : révoque le droit', async () => {
    const repo = fakeRepo([{ ...subscriptionRow }]);
    const event = { type: 'customer.subscription.deleted', data: { object: { id: 'sub_123' } } };
    expect(await handleStripeEvent(event, repo)).toBe('revoked');
    expect(repo.rows[0].status).toBe('revoked');
  });

  it('ignore un abonnement inconnu et les autres événements', async () => {
    const repo = fakeRepo();
    expect(
      await handleStripeEvent({ type: 'customer.subscription.deleted', data: { object: { id: 'sub_inconnu' } } }, repo),
    ).toBe('ignored');
    expect(await handleStripeEvent({ type: 'invoice.paid', data: { object: {} } }, repo)).toBe('ignored');
  });
});
