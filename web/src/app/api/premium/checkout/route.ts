/**
 * Création d'une session Stripe Checkout — port de
 * `backend/app/api/v1/users.py::create_checkout_session`. Aucun droit n'est
 * accordé ici : il l'est par le webhook, une fois le paiement confirmé.
 */

import { isEntitlementActive } from '@/lib/premium';
import { supabaseEntitlementRepo } from '@/lib/server/entitlements';
import {
  type PremiumProduct,
  getServiceSupabase,
  getStripe,
  getUserFromRequest,
  jsonError,
  siteUrl,
  stripeConfig,
  stripeConfigured,
} from '@/lib/server/stripeConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRODUCTS: readonly PremiumProduct[] = ['monthly', 'yearly'];

export async function POST(request: Request): Promise<Response> {
  if (!stripeConfigured()) {
    return jsonError('stripe_not_configured', "Le paiement n'est pas encore activé.", 501);
  }
  const user = await getUserFromRequest(request);
  if (!user) return jsonError('unauthorized', 'Connectez-vous pour souscrire.', 401);

  const body = (await request.json().catch(() => null)) as { product?: string; consent?: boolean } | null;
  const product = PRODUCTS.find((candidate) => candidate === body?.product);
  if (!product) return jsonError('invalid_product', 'Offre inconnue.', 400);
  if (body?.consent !== true) {
    return jsonError(
      'consent_required',
      'Acceptez les CGV et la renonciation au droit de rétractation pour continuer.',
      400,
    );
  }

  const priceId = stripeConfig().prices[product];
  if (!priceId) return jsonError('stripe_price_missing', `Aucun prix configuré pour « ${product} ».`, 501);

  const repo = supabaseEntitlementRepo(getServiceSupabase());
  const existing = await repo.listForUser(user.id);
  if (existing.some((entitlement) => isEntitlementActive(entitlement))) {
    return jsonError('already_premium', 'Votre compte est déjà Premium.', 409);
  }

  const site = siteUrl(request);
  const consentedAt = new Date().toISOString();
  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    metadata: { user_id: user.id, product, consent_cgv_retractation: consentedAt },
    subscription_data: { metadata: { user_id: user.id, product } },
    ...(user.email ? { customer_email: user.email } : {}),
    success_url: `${site}/premium/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/premium`,
    allow_promotion_codes: true,
    custom_text: {
      submit: {
        message:
          "Abonnement sans engagement, résiliable à tout moment depuis la page Premium. " +
          "Accès immédiat : vous avez renoncé au droit de rétractation de 14 jours.",
      },
    },
  });
  if (!session.url) return jsonError('stripe_error', 'Session de paiement indisponible.', 502);
  return Response.json({ checkout_url: session.url }, { status: 201 });
}
