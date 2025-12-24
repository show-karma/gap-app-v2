"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chainPayoutAddressService } from "../services/chain-payout-address.service";
import type { ChainPayoutAddressMap } from "../types/chain-payout-address";

/**
 * Hook for updating chain payout addresses
 *
 * @param projectId - Project UID or slug
 * @param options - Optional callbacks for success/error handling
 */
export function useUpdateChainPayoutAddress(
  projectId: string,
  options?: {
    onSuccess?: (data: ChainPayoutAddressMap | null) => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chainPayoutAddresses: Record<string, string | null>) =>
      chainPayoutAddressService.update(projectId, chainPayoutAddresses),
    onSuccess: (data) => {
      // Invalidate project queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * Helper to check if a project has any configured payout addresses
 */
export function hasConfiguredPayoutAddresses(
  chainPayoutAddress?: ChainPayoutAddressMap | null
): boolean {
  if (!chainPayoutAddress) return false;
  return Object.values(chainPayoutAddress).some((address) => Boolean(address));
}

/**
 * Helper to get the payout address for a specific chain
 */
export function getPayoutAddressForChain(
  chainPayoutAddress: ChainPayoutAddressMap | null | undefined,
  chainId: number
): string | undefined {
  if (!chainPayoutAddress) return undefined;
  return chainPayoutAddress[String(chainId)] || undefined;
}
