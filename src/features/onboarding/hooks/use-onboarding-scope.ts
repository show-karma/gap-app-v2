"use client";

import { useEffect, useMemo } from "react";
import { usePrivyBridge } from "@/contexts/privy-bridge-context";
import { ANONYMOUS_SCOPE, migrateAnonymousState } from "../lib/storage";

/**
 * Users whose anonymous state has already been folded in, shared across every
 * hook instance. `useOnboardingScope` is called from several places at once, so
 * a per-hook ref would run the migration once per caller; the barrier in
 * hooks/useAuth.ts is module-level for the same reason.
 */
const migratedUserIds = new Set<string>();

export interface OnboardingScope {
  /** Identity that onboarding state is filed under — a Privy DID, or `anon`. */
  scope: string;
  /**
   * False until Privy has settled. Reads taken before this can be attributed to
   * the wrong identity: `authenticated` flips true a moment before the user
   * object lands, so an eager read files a signed-in user's progress under the
   * anonymous scope.
   */
  isReady: boolean;
  isAuthenticated: boolean;
}

export function useOnboardingScope(): OnboardingScope {
  const { ready, authenticated, user } = usePrivyBridge();
  const userId = authenticated ? user?.id : undefined;

  useEffect(() => {
    if (!ready || !userId || migratedUserIds.has(userId)) return;
    migratedUserIds.add(userId);
    migrateAnonymousState(userId);
  }, [ready, userId]);

  return useMemo(() => {
    if (!ready) {
      return { scope: ANONYMOUS_SCOPE, isReady: false, isAuthenticated: false };
    }
    // Authenticated but no user object yet — Privy is mid-hydration. Holding
    // `isReady` false keeps callers from writing under the anonymous scope.
    if (authenticated && !userId) {
      return { scope: ANONYMOUS_SCOPE, isReady: false, isAuthenticated: true };
    }
    return {
      scope: userId ?? ANONYMOUS_SCOPE,
      isReady: true,
      isAuthenticated: Boolean(userId),
    };
  }, [ready, authenticated, userId]);
}
