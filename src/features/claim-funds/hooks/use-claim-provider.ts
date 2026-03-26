"use client";

import { useMemo } from "react";
import type { ClaimGrantsConfig } from "@/src/infrastructure/types/tenant";
import { createClaimProvider } from "../providers/provider-factory";
import type { ClaimProvider } from "../providers/types";

/**
 * Get a claim provider from claim grants configuration.
 * Adapted from whitelabel's useTenantSafe() pattern to accept config directly.
 */
export function useClaimProvider(claimGrants: ClaimGrantsConfig | undefined): ClaimProvider | null {
  return useMemo(() => {
    if (!claimGrants) {
      return null;
    }
    return createClaimProvider(claimGrants);
  }, [claimGrants]);
}

export function useClaimGrantsEnabled(claimGrants: ClaimGrantsConfig | undefined): boolean {
  return Boolean(claimGrants?.enabled);
}
