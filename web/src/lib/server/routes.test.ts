import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StoredEntitlement } from './entitlements';

const mocks = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://exemple.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  process.env.STRIPE_SECRET_KEY = 'sk_test_fictif';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fictif';
  process.env.STRIPE_PRICE_MONTHLY = 'price_monthly';
  process.env.STRIPE_PRICE_YEARLY = 'price_yearly';
  process.env.SITE_URL = 'https://lotolab.test';
  return {
    rows: [] as StoredEntitlement[],
    user: null as { id: string; email: string | null } | null,
    createSession: vi.fn(),
  };
});

vi.mock('@/lib/server/entitlements', () => ({
  supabaseEntitlementRepo: () => ({
    findByReceiptRef: async (ref: string) => mocks.rows.find((row) => row.receipt_ref === ref) ?? null,
    listForUser: async (userId: string) => mocks.rows.filter((row) => row.user_id === userId),
    insert: async (entitlement: Omit<StoredEntitlement, 'id'>) => {
      mocks.rows.push({ id: mocks.rows.length + 1, ...entitlement });
    },
    update: async () => undefined,
  }),
}));

vi.mock('@/lib/server/stripeConfig', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./stripeConfig')>();
  const realStripe = actual.getStripe();
  return {
    ...actual,
    getUserFromRequest: async () => mocks.user,
    getStripe: () => ({ webhooks: realStripe.webhooks, checkout: { sessions: { create: mocks.createSession } } }),
  };
});

const { POST: webhook } = await import('@/app/api/stripe/webhook/route');
const { POST: checkout } = await import('@/app/api/premium/checkout/route');

beforeEach(() => {
  mocks.rows.length = 0;
  mocks.user = null;
  mocks.createSession.mockReset();
});

describe('POST /api/stripe/webhook', () => {
  const payload = JSON.stringify({
    id: 'evt_1',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_1',
        payment_status: 'paid',
        client_reference_id: 'user-1',
        subscription: 'sub_1',
        metadata: { user_id: 'user-1', product: 'yearly' },
      },
    },
  });

  function webhookRequest(signature?: string) {
    return new Request('https://lotolab.test/api/stripe/webhook', {
      method: 'POST',
      headers: signature ? { 'stripe-signature': signature } : {},
      body: payload,
    });
  }

  it('refuse un appel sans signature ou avec une signature invalide', async () => {
    expect((await webhook(webhookRequest())).status).toBe(400);
    const forged = new Stripe('sk_test_fictif').webhooks.generateTestHeaderString({ payload, secret: 'whsec_autre' });
    expect((await webhook(webhookRequest(forged))).status).toBe(400);
    expect(mocks.rows).toHaveLength(0);
  });

  it('accorde le Premium sur un événement correctement signé', async () => {
    const signature = new Stripe('sk_test_fictif').webhooks.generateTestHeaderString({
      payload,
      secret: 'whsec_test_fictif',
    });
    const response = await webhook(webhookRequest(signature));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, outcome: 'granted' });
    expect(mocks.rows[0]).toMatchObject({ user_id: 'user-1', product: 'yearly', receipt_ref: 'sub_1', status: 'active' });
  });
});

describe('POST /api/premium/checkout', () => {
  function checkoutRequest(body: unknown) {
    return new Request('https://lotolab.test/api/premium/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jeton' },
      body: JSON.stringify(body),
    });
  }

  it('exige une connexion', async () => {
    expect((await checkout(checkoutRequest({ product: 'monthly', consent: true }))).status).toBe(401);
  });

  it('exige une offre valide et le consentement CGV + rétractation', async () => {
    mocks.user = { id: 'user-1', email: 'a@b.fr' };
    expect((await checkout(checkoutRequest({ product: 'lifetime', consent: true }))).status).toBe(400);
    expect((await checkout(checkoutRequest({ product: 'monthly' }))).status).toBe(400);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it('refuse un second abonnement à un compte déjà Premium', async () => {
    mocks.user = { id: 'user-1', email: 'a@b.fr' };
    mocks.rows.push({
      id: 1,
      user_id: 'user-1',
      product: 'monthly',
      platform: 'stripe',
      status: 'active',
      receipt_ref: 'sub_1',
      expires_at: null,
    });
    expect((await checkout(checkoutRequest({ product: 'yearly', consent: true }))).status).toBe(409);
  });

  it('crée une session d’abonnement liée au compte, sans accorder de droit', async () => {
    mocks.user = { id: 'user-1', email: 'a@b.fr' };
    mocks.createSession.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_1' });
    const response = await checkout(checkoutRequest({ product: 'yearly', consent: true }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ checkout_url: 'https://checkout.stripe.com/c/pay/cs_1' });
    expect(mocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_yearly', quantity: 1 }],
        client_reference_id: 'user-1',
        customer_email: 'a@b.fr',
        success_url: 'https://lotolab.test/premium/succes?session_id={CHECKOUT_SESSION_ID}',
        metadata: expect.objectContaining({ user_id: 'user-1', product: 'yearly' }),
      }),
    );
    expect(mocks.rows).toHaveLength(0);
  });
});
