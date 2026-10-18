/**
 * Paliers anonyme / gratuit / Premium — port de `backend/app/services/premium.py`
 * pour le mode sans API (calculs dans le navigateur). Le statut Premium vient
 * du droit de l'utilisateur dans `premium_entitlements` (lecture RLS limitée
 * à ses propres lignes), écrit uniquement par le webhook Stripe.
 */

import type { GeneratorMethod } from './generatorFallback';

export type Tier = 'anonymous' | 'free' | 'premium';

export interface TierLimits {
  methods: readonly GeneratorMethod[];
  maxGrids: number;
  maxIterations: number;
}

const ALL_METHODS: readonly GeneratorMethod[] = [
  'random',
  'frequency',
  'delay',
  'balanced',
  'sum_controlled',
  'diversified',
];

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  anonymous: { methods: ['random'], maxGrids: 1, maxIterations: 1_000 },
  free: { methods: ['random', 'frequency'], maxGrids: 3, maxIterations: 10_000 },
  premium: { methods: ALL_METHODS, maxGrids: 20, maxIterations: 250_000 },
};

export interface Entitlement {
  id: number;
  status: string;
  expires_at: string | null;
  platform?: string;
  product?: string;
}

export function isEntitlementActive(entitlement: Entitlement, now: Date = new Date()): boolean {
  return (
    entitlement.status === 'active' &&
    (entitlement.expires_at === null || new Date(entitlement.expires_at).getTime() > now.getTime())
  );
}

export function tierFor(signedIn: boolean, entitlements: Entitlement[], now: Date = new Date()): Tier {
  if (!signedIn) return 'anonymous';
  return entitlements.some((e) => isEntitlementActive(e, now)) ? 'premium' : 'free';
}

export function canUseMethod(tier: Tier, method: GeneratorMethod): boolean {
  return TIER_LIMITS[tier].methods.includes(method);
}
