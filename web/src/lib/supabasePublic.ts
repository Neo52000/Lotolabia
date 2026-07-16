/**
 * Repli en lecture directe sur Supabase (clé publique `anon`, protégée par
 * RLS — lecture seule publique des tirages) quand l'API FastAPI n'est pas
 * joignable. N'expose et n'écrit jamais rien : uniquement des SELECT sur des
 * données déjà publiques par construction.
 *
 * Utilisé comme repli pour les données brutes de tirages (`draws`) — les
 * statistiques calculées (fréquences, retards...) restent servies par l'API,
 * qui seule porte le moteur statistique.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Draw, DrawPage } from './api';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabasePublicConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return client;
}

interface DrawRow {
  id: number;
  draw_date: string;
  numbers: number[];
  chance: number;
  source: string;
}

function toDraw(row: DrawRow): Draw {
  return { id: row.id, draw_date: row.draw_date, numbers: row.numbers, chance: row.chance, source: row.source };
}

export async function supabaseLatestDraw(): Promise<Draw | null> {
  if (!supabasePublicConfigured) return null;
  const { data, error } = await getClient()
    .from('draws')
    .select('id, draw_date, numbers, chance, source')
    .order('draw_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return toDraw(data as DrawRow);
}

export async function supabaseDraws(
  page: number,
  pageSize: number,
  year?: number,
  month?: number,
): Promise<DrawPage | null> {
  if (!supabasePublicConfigured) return null;
  let query = getClient().from('draws').select('id, draw_date, numbers, chance, source', { count: 'exact' });
  if (year) {
    const monthStart = month ? `${year}-${String(month).padStart(2, '0')}-01` : `${year}-01-01`;
    const nextMonth = month ? (month === 12 ? year + 1 : year) : year + 1;
    const nextMonthNum = month ? (month === 12 ? 1 : month + 1) : 1;
    const monthEnd = `${nextMonth}-${String(nextMonthNum).padStart(2, '0')}-01`;
    query = query.gte('draw_date', monthStart).lt('draw_date', monthEnd);
  }
  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order('draw_date', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error || !data) return null;
  return {
    items: (data as DrawRow[]).map(toDraw),
    total: count ?? data.length,
    page,
    page_size: pageSize,
    truncated: false,
  };
}

/**
 * Tous les tirages, triés par date croissante (nécessaire pour reproduire
 * fidèlement les calculs de `statsFallback.ts`, qui suppose cet ordre).
 * Pagine par blocs de 1000 lignes (limite par défaut de PostgREST) pour
 * couvrir l'historique complet quel que soit son volume.
 */
export async function supabaseAllDraws(): Promise<Draw[]> {
  if (!supabasePublicConfigured) return [];
  const pageSize = 1000;
  const all: Draw[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await getClient()
      .from('draws')
      .select('id, draw_date, numbers, chance, source')
      .order('draw_date', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as DrawRow[]).map(toDraw));
    if (data.length < pageSize) break;
  }
  return all;
}

export async function supabaseDrawByDate(date: string): Promise<Draw | null> {
  if (!supabasePublicConfigured) return null;
  const { data, error } = await getClient()
    .from('draws')
    .select('id, draw_date, numbers, chance, source')
    .eq('draw_date', date)
    .maybeSingle();
  if (error || !data) return null;
  return toDraw(data as DrawRow);
}
