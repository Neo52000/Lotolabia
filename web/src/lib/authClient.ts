/**
 * Client Supabase Auth partagé pour les comptes utilisateurs (login/signup,
 * jeton d'accès pour les appels authentifiés de l'API `/api/v1/me/*`).
 * Même clé publique `anon` que `supabasePublic.ts`, mais avec persistance de
 * session (contrairement au client de lecture publique, qui n'en a pas besoin).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const authConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

export function getAuthClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

export async function getAccessToken(): Promise<string | null> {
  if (!authConfigured) return null;
  const { data } = await getAuthClient().auth.getSession();
  return data.session?.access_token ?? null;
}
