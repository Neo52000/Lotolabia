'use client';

import { useEffect, useState } from 'react';

import { authConfigured, getAuthClient } from './authClient';
import { type Entitlement, type Tier, tierFor } from './premium';

export interface PremiumStatus {
  loading: boolean;
  signedIn: boolean;
  tier: Tier;
}

/** Palier de l'utilisateur courant, mis à jour à la connexion/déconnexion. */
export function usePremiumStatus(): PremiumStatus {
  const [status, setStatus] = useState<PremiumStatus>({
    loading: authConfigured,
    signedIn: false,
    tier: 'anonymous',
  });

  useEffect(() => {
    if (!authConfigured) return;
    const supabase = getAuthClient();
    let active = true;

    async function refresh(userId: string | undefined) {
      if (!userId) {
        if (active) setStatus({ loading: false, signedIn: false, tier: 'anonymous' });
        return;
      }
      const { data } = await supabase
        .from('premium_entitlements')
        .select('id, status, expires_at, platform, product')
        .eq('user_id', userId);
      if (active) {
        setStatus({ loading: false, signedIn: true, tier: tierFor(true, (data ?? []) as Entitlement[]) });
      }
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void refresh(session?.user.id);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return status;
}
