/**
 * Configuration serveur du paiement Stripe (route handlers Next.js, exécutés
 * en fonctions Netlify). Les secrets viennent des variables d'environnement
 * du site — jamais préfixées `NEXT_PUBLIC_`, donc jamais envoyées au navigateur.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export type PremiumProduct = 'monthly' | 'yearly';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function stripeConfig() {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    prices: {
      monthly: process.env.STRIPE_PRICE_MONTHLY ?? '',
      yearly: process.env.STRIPE_PRICE_YEARLY ?? '',
    } satisfies Record<PremiumProduct, string>,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  };
}

export function stripeConfigured(): boolean {
  const config = stripeConfig();
  return Boolean(config.secretKey && config.webhookSecret && config.serviceRoleKey && SUPABASE_URL);
}

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) stripe = new Stripe(stripeConfig().secretKey);
  return stripe;
}

export function getServiceSupabase(): SupabaseClient {
  return createClient(SUPABASE_URL, stripeConfig().serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function siteUrl(request: Request): string {
  return (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
}

export interface RequestUser {
  id: string;
  email: string | null;
}

/** Utilisateur authentifié par son jeton Supabase (en-tête `Authorization: Bearer`). */
export async function getUserFromRequest(request: Request): Promise<RequestUser | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

export function jsonError(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}
