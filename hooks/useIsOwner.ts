"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { compareAllWallets } from "@/utilities/auth/compare-all-wallets";

/**
 * Hook to determine if the current user is the owner of a resource.
 * @param ownerAddress - The wallet address of the resource owner
 * @returns boolean indicating whether the current user is the owner
 */
export function useIsOwner(ownerAddress: string): boolean {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user || !ownerAddress) {
      return false;
    }
    return compareAllWallets(user, ownerAddress);
  }, [user, ownerAddress]);
}
