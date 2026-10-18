/**
 * Accès serveur aux droits Premium (`premium_entitlements`), avec la clé
 * service role — la seule autorisée à écrire dans cette table (RLS).
 * Ne jamais importer depuis un composant client.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface StoredEntitlement {
  id: number;
  user_id: string;
  product: string;
  platform: string;
  status: string;
  receipt_ref: string | null;
  expires_at: string | null;
}

export interface NewEntitlement {
  user_id: string;
  product: string;
  platform: 'stripe';
  status: 'active';
  receipt_ref: string;
  expires_at: null;
}

export interface EntitlementRepo {
  findByReceiptRef(receiptRef: string): Promise<StoredEntitlement | null>;
  listForUser(userId: string): Promise<StoredEntitlement[]>;
  insert(entitlement: NewEntitlement): Promise<void>;
  update(id: number, fields: { status?: string; expires_at?: string | null }): Promise<void>;
}

const COLUMNS = 'id, user_id, product, platform, status, receipt_ref, expires_at';

export function supabaseEntitlementRepo(client: SupabaseClient): EntitlementRepo {
  return {
    async findByReceiptRef(receiptRef) {
      const { data, error } = await client
        .from('premium_entitlements')
        .select(COLUMNS)
        .eq('receipt_ref', receiptRef)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as StoredEntitlement | null) ?? null;
    },
    async listForUser(userId) {
      const { data, error } = await client.from('premium_entitlements').select(COLUMNS).eq('user_id', userId);
      if (error) throw error;
      return (data ?? []) as StoredEntitlement[];
    },
    async insert(entitlement) {
      const { error } = await client.from('premium_entitlements').insert(entitlement);
      if (error) throw error;
    },
    async update(id, fields) {
      const { error } = await client.from('premium_entitlements').update(fields).eq('id', id);
      if (error) throw error;
    },
  };
}
