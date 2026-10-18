/**
 * Portail client Stripe : gérer ou résilier son abonnement en ligne
 * (résiliation aussi simple que la souscription).
 */

import { isEntitlementActive } from '@/lib/premium';
import { supabaseEntitlementRepo } from '@/lib/server/entitlements';
import {
  getServiceSupabase,
  getStripe,
  getUserFromRequest,
  jsonError,
  siteUrl,
  stripeConfigured,
} from '@/lib/server/stripeConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  if (!stripeConfigured()) {
    return jsonError('stripe_not_configured', "Le paiement n'est pas encore activé.", 501);
  }
  const user = await getUserFromRequest(request);
  if (!user) return jsonError('unauthorized', 'Connectez-vous pour gérer votre abonnement.', 401);

  const repo = supabaseEntitlementRepo(getServiceSupabase());
  const subscriptionRef = (await repo.listForUser(user.id)).find(
    (entitlement) =>
      entitlement.platform === 'stripe' &&
      entitlement.receipt_ref?.startsWith('sub_') &&
      isEntitlementActive(entitlement),
  )?.receipt_ref;
  if (!subscriptionRef) {
    return jsonError('no_subscription', 'Aucun abonnement Stripe actif sur ce compte.', 404);
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionRef);
  const customer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const portal = await stripe.billingPortal.sessions.create({
    customer,
    return_url: `${siteUrl(request)}/premium`,
  });
  return Response.json({ portal_url: portal.url });
}
