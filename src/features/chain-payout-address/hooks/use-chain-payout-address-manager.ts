"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { isAddress } from "viem";
import { getProject } from "@/services/project.service";
import type { Project as ProjectResponse } from "@/types/v2/project";

interface CartItem {
  uid: string;
  slug?: string;
  title: string;
  imageURL?: string;
}

interface PayoutStatus {
  address?: string;
  isLoading: boolean;
  isMissing: boolean;
}

interface UseChainPayoutAddressManagerOptions {
  /** Chain ID for chain-specific payout address lookup */
  chainId?: number;
}

/**
 * Hook for managing chain-specific payout addresses.
 * Unlike usePayoutAddressManager, this hook ONLY resolves from chainPayoutAddress
 * with no fallbacks to legacy payoutAddress, grants, or owner.
 *
 * @param items - Cart items to resolve payout addresses for
 * @param options - Options including chainId for specific chain lookup
 */
export function useChainPayoutAddressManager(
  items: CartItem[],
  options: UseChainPayoutAddressManagerOptions = {}
) {
  const { chainId } = options;

  const [payoutAddresses, setPayoutAddresses] = useState<Record<string, string>>({});
  const [missingPayouts, setMissingPayouts] = useState<string[]>([]);
  const [isFetchingPayouts, setIsFetchingPayouts] = useState(false);

  /**
   * SECURITY: Resolve and validate payout address from chainPayoutAddress ONLY
   * - Returns undefined if no address is found OR if address is invalid
   * - Validates that the address is a proper Ethereum address
   * - Uses ONLY chainPayoutAddress - no fallbacks
   */
  const resolvePayoutAddress = useCallback(
    (project: ProjectResponse): string | undefined => {
      if (!project.chainPayoutAddress) {
        return undefined;
      }

      let candidateAddress: string | undefined;

      if (chainId) {
        // If chainId specified, look for that specific chain
        const chainAddress = project.chainPayoutAddress[String(chainId)];
        if (chainAddress) {
          candidateAddress = chainAddress;
        }
      } else {
        // If no chainId, take first available from chainPayoutAddress
        const firstChainAddress = Object.values(project.chainPayoutAddress).find(
          (addr) => typeof addr === "string" && addr
        );
        if (typeof firstChainAddress === "string") {
          candidateAddress = firstChainAddress;
        }
      }

      // SECURITY: Validate that the address is a valid Ethereum address
      // This prevents sending funds to invalid/malformed addresses
      if (candidateAddress && isAddress(candidateAddress)) {
        return candidateAddress;
      }

      return undefined;
    },
    [chainId]
  );

  useEffect(() => {
    if (!items.length) {
      // Only update state if it's not already empty to prevent infinite loops
      setPayoutAddresses((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setMissingPayouts((prev) => (prev.length === 0 ? prev : []));
      setIsFetchingPayouts(false);
      return;
    }

    let ignore = false;

    const fetchPayoutAddresses = async () => {
      setIsFetchingPayouts(true);
      try {
        const results = await Promise.all(
          items.map(async (item) => {
            const projectId = item.slug || item.uid;
            const project = await getProject(projectId);
            const address = project ? resolvePayoutAddress(project) : undefined;
            return { projectId: item.uid, address };
          })
        );

        if (ignore) return;

        const addressMap: Record<string, string> = {};
        const missing: string[] = [];

        for (const { projectId, address } of results) {
          if (address) {
            addressMap[projectId] = address;
          } else {
            missing.push(projectId);
          }
        }

        setPayoutAddresses(addressMap);
        setMissingPayouts(missing);
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load chain payout addresses", error);
          toast.error("Unable to load payout addresses. Please try again.");
        }
      } finally {
        if (!ignore) {
          setIsFetchingPayouts(false);
        }
      }
    };

    fetchPayoutAddresses();

    return () => {
      ignore = true;
    };
  }, [items, resolvePayoutAddress]);

  const payoutStatusByProject: Record<string, PayoutStatus> = items.reduce(
    (acc, item) => {
      const address = payoutAddresses[item.uid];
      const isLoading = isFetchingPayouts && !address;
      const hasFailed = !isFetchingPayouts && !address;
      acc[item.uid] = {
        address,
        isLoading,
        isMissing: hasFailed,
      };
      return acc;
    },
    {} as Record<string, PayoutStatus>
  );

  const formatAddress = useCallback((address?: string) => {
    if (!address) return "Not configured";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  return {
    payoutAddresses,
    missingPayouts,
    isFetchingPayouts,
    payoutStatusByProject,
    formatAddress,
    setMissingPayouts,
  };
}
