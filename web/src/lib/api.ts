/**
 * Couche d'accès à l'API LotoLab IA côté serveur (SSR/ISR).
 *
 * Toutes les fonctions tolèrent l'indisponibilité de l'API (retour null) :
 * les pages affichent alors un état « données en cours de collecte » et se
 * marquent noindex pour éviter d'indexer des pages vides.
 *
 * Repli tirages bruts : si l'API FastAPI n'est pas joignable, `latestDraw`,
 * `draws` et `drawByDate` retombent sur une lecture directe de Supabase
 * (RLS publique en lecture sur `draws`) — voir `supabasePublic.ts`. Les
 * statistiques calculées (fréquences, retards...) restent servies
 * exclusivement par l'API, qui seule porte le moteur statistique.
 */

import { supabaseDraws, supabaseDrawByDate, supabaseLatestDraw } from './supabasePublic';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export const REVALIDATE_SECONDS = 3600;

async function get<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export interface Draw {
  id: number;
  draw_date: string;
  numbers: number[];
  chance: number;
  source: string;
}

export interface DrawPage {
  items: Draw[];
  total: number;
  page: number;
  page_size: number;
  truncated: boolean;
}

export interface NumberStat {
  number: number;
  count?: number;
  relative?: number;
  delay?: number | null;
}

export interface StatsPayload {
  draw_count: number;
  period_start: string | null;
  period_end: string | null;
  explanation: string;
  disclaimer: string;
  numbers: NumberStat[];
  chance: NumberStat[];
  [key: string]: unknown;
}

export const api = {
  latestDraw: async () => (await get<Draw>('/api/v1/draws/latest')) ?? supabaseLatestDraw(),
  draws: async (page = 1, pageSize = 20, year?: number, month?: number) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    const fromApi = await get<DrawPage>(`/api/v1/draws?${params.toString()}`);
    return fromApi ?? supabaseDraws(page, pageSize, year, month);
  },
  drawByDate: async (date: string) => (await get<Draw>(`/api/v1/draws/${date}`)) ?? supabaseDrawByDate(date),
  overview: () => get<Record<string, unknown>>('/api/v1/stats/overview'),
  frequencies: (window?: number) =>
    get<StatsPayload>(`/api/v1/stats/frequencies${window ? `?window=${window}` : ''}`),
  delays: (window?: number) =>
    get<StatsPayload>(`/api/v1/stats/delays${window ? `?window=${window}` : ''}`),
  gaps: () => get<StatsPayload>('/api/v1/stats/gaps'),
  pairs: (limit = 20) => get<Record<string, unknown>>(`/api/v1/stats/pairs?limit=${limit}`),
  shapes: () => get<Record<string, unknown>>('/api/v1/stats/shapes'),
  periods: (granularity: 'year' | 'month' = 'year') =>
    get<Record<string, unknown>>(`/api/v1/stats/periods?granularity=${granularity}`),
  numberProfile: (n: number, isChance = false) =>
    get<Record<string, unknown>>(`/api/v1/stats/numbers/${n}?is_chance=${isChance}`),
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const DISCLAIMER =
  'Les tirages sont aléatoires. Les statistiques passées ne permettent pas de prévoir ' +
  'avec certitude les résultats futurs. Toute grille valide conserve la même probabilité ' +
  'théorique de gain.';

export const INDEPENDENCE =
  "LotoLab IA est un outil indépendant d'analyse statistique. Il n'est pas affilié à la " +
  'FDJ ni à aucun opérateur de jeux.';

export function formatDateFr(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
