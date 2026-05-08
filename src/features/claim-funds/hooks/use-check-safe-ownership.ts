"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import type { SupportedChainId } from "@/config/tokens";
import { canProposeToSafe } from "@/utilities/safe";

/**
 * Detects whether the connected wallet can propose transactions to the
 * given Safe — i.e. is an owner OR a delegate. The check runs on the
 * campaign's chain, not the wallet's currently selected chain.
 */
export function useCheckSafeOwnership(
  alternateAddress: `0x${string}` | null,
  chainId: SupportedChainId,
  enabled: boolean = true
) {
  const { address: userAddress } = useAccount();

  const { data: canPropose, isLoading } = useQuery({
    queryKey: ["safe-can-propose", alternateAddress, userAddress, chainId],
    queryFn: async () => {
      if (!alternateAddress || !userAddress) return false;

      try {
        const result = await canProposeToSafe(alternateAddress, userAddress, chainId);
        return result.canPropose;
      } catch {
        // Not a Safe or error checking permissions - return false
        return false;
      }
    },
    enabled: enabled && !!alternateAddress && !!userAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    canProposeViaSafe: canPropose ?? false,
    isCheckingOwnership: isLoading,
  };
}
