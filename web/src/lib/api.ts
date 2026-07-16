/**
 * Couche d'accès à l'API LotoLab IA côté serveur (SSR/ISR).
 *
 * Toutes les fonctions tolèrent l'indisponibilité de l'API (retour null) :
 * les pages affichent alors un état « données en cours de collecte » et se
 * marquent noindex pour éviter d'indexer des pages vides.
 *
 * Repli si l'API FastAPI n'est pas joignable :
 *  - `latestDraw`, `draws`, `drawByDate` retombent sur une lecture directe de
 *    Supabase (RLS publique en lecture sur `draws`) — voir `supabasePublic.ts` ;
 *  - `overview`, `frequencies`, `delays`, `numberProfile` retombent sur un
 *    calcul local fidèle au moteur statistique Python — voir
 *    `statsFallback.ts` et `numberProfileFallback.ts`.
 * Le générateur (méthodes random/frequency), les simulations, les
 * paires/triplets et les écarts min/moy/max restent servis exclusivement par
 * l'API : cette logique n'est pas dupliquée côté client pour éviter toute
 * divergence.
 */

import { supabaseAllDraws, supabaseDraws, supabaseDrawByDate, supabaseLatestDraw } from './supabasePublic';
import { applyWindow, computeDelays, computeFrequencies, computeOverview } from './statsFallback';
import { computeNumberProfile } from './numberProfileFallback';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export const REVALIDATE_SECONDS = 3600;

export const DISCLAIMER =
  'Les tirages sont aléatoires. Les statistiques passées ne permettent pas de prévoir ' +
  'avec certitude les résultats futurs. Toute grille valide conserve la même probabilité ' +
  'théorique de gain.';

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
  overview: async () => {
    const fromApi = await get<Record<string, unknown>>('/api/v1/stats/overview');
    if (fromApi) return fromApi;
    const draws = await supabaseAllDraws();
    return draws.length > 0 ? computeOverview(draws, DISCLAIMER) : null;
  },
  frequencies: async (window?: number) => {
    const fromApi = await get<StatsPayload>(
      `/api/v1/stats/frequencies${window ? `?window=${window}` : ''}`,
    );
    if (fromApi) return fromApi;
    const draws = await supabaseAllDraws();
    return draws.length > 0 ? computeFrequencies(applyWindow(draws, window), DISCLAIMER) : null;
  },
  delays: async (window?: number) => {
    const fromApi = await get<StatsPayload>(`/api/v1/stats/delays${window ? `?window=${window}` : ''}`);
    if (fromApi) return fromApi;
    const draws = await supabaseAllDraws();
    return draws.length > 0 ? computeDelays(applyWindow(draws, window), DISCLAIMER) : null;
  },
  gaps: () => get<StatsPayload>('/api/v1/stats/gaps'),
  pairs: (limit = 20) => get<Record<string, unknown>>(`/api/v1/stats/pairs?limit=${limit}`),
  shapes: () => get<Record<string, unknown>>('/api/v1/stats/shapes'),
  periods: (granularity: 'year' | 'month' = 'year') =>
    get<Record<string, unknown>>(`/api/v1/stats/periods?granularity=${granularity}`),
  numberProfile: async (n: number, isChance = false) => {
    const fromApi = await get<Record<string, unknown>>(
      `/api/v1/stats/numbers/${n}?is_chance=${isChance}`,
    );
    if (fromApi) return fromApi;
    const draws = await supabaseAllDraws();
    if (draws.length === 0) return null;
    try {
      return computeNumberProfile(draws, n, isChance, DISCLAIMER) as unknown as Record<string, unknown>;
    } catch {
      return null;
    }
  },
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

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
