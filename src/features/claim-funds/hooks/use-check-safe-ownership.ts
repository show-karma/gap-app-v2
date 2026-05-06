"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import type { SupportedChainId } from "@/config/tokens";
import { isSafeOwner } from "@/utilities/safe";

export function useCheckSafeOwnership(
  alternateAddress: `0x${string}` | null,
  chainId: SupportedChainId,
  enabled: boolean = true
) {
  const { address: userAddress } = useAccount();

  const { data: isSafeYouOwn, isLoading } = useQuery({
    queryKey: ["safe-ownership", alternateAddress, userAddress, chainId],
    queryFn: async () => {
      if (!alternateAddress || !userAddress) return false;

      try {
        const result = await isSafeOwner(alternateAddress, userAddress, chainId);
        return result;
      } catch (error) {
        // Not a Safe or error checking ownership - return false
        return false;
      }
    },
    enabled: enabled && !!alternateAddress && !!userAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    isSafeYouOwn: isSafeYouOwn ?? false,
    isCheckingOwnership: isLoading,
  };
}
