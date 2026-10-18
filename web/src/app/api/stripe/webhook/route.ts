/**
 * Webhook Stripe — point d'entrée public : la confiance vient exclusivement de
 * la vérification de signature, jamais du corps brut seul.
 */

import { supabaseEntitlementRepo } from '@/lib/server/entitlements';
import { getServiceSupabase, getStripe, jsonError, stripeConfig, stripeConfigured } from '@/lib/server/stripeConfig';
import { type StripeEventLike, handleStripeEvent } from '@/lib/server/stripeWebhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  if (!stripeConfigured()) {
    return jsonError('stripe_not_configured', "Le paiement n'est pas encore activé.", 501);
  }
  const signature = request.headers.get('stripe-signature');
  const payload = await request.text();
  let event: StripeEventLike;
  try {
    if (!signature) throw new Error('missing signature');
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      stripeConfig().webhookSecret,
    ) as unknown as StripeEventLike;
  } catch {
    return jsonError('stripe_invalid_signature', 'Signature Stripe invalide.', 400);
  }

  const outcome = await handleStripeEvent(event, supabaseEntitlementRepo(getServiceSupabase()));
  return Response.json({ received: true, outcome });
}
