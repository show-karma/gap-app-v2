import { useQuery } from "@tanstack/react-query";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";
import { useSigner } from "@/utilities/eas-wagmi-utils";

import type { Hex } from "viem";
import { useEffect, useState } from "react";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";

import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { useWallet } from "./useWallet";

/**
 * Options for configuring the useIsCommunityAdmin hook
 */
interface UseIsCommunityAdminOptions {
  /** Whether the query should be enabled. Defaults to true when prerequisites are met */
  enabled?: boolean;
  /** Optional Zustand store sync configuration for backwards compatibility */
  zustandSync?: {
    /** Function to update the community admin status in Zustand store */
    setIsCommunityAdmin?: (isAdmin: boolean) => void;
    /** Function to update the loading state in Zustand store */
  };
}

/**
 * Hook to check if a user is admin of a community
 *
 * @param communityUID - The community UID to check admin status for
 * @param address - User address to check (defaults to connected account if not provided)
 * @param options - Configuration options for the hook behavior
 * @param community - Optional pre-fetched community object to avoid additional API calls
 *
 * @returns {Object} Object containing:
 * - isCommunityAdmin: boolean indicating if the user is an admin
 * - isLoading: boolean indicating if the check is in progress
 * - isError: boolean indicating if an error occurred
 * - error: any error that occurred during the check
 * - refetch: function to manually trigger a re-check
 *
 * @example
 * ```tsx
 * const { isCommunityAdmin, isLoading } = useIsCommunityAdmin('community-123', userAddress);
 *
 * if (isLoading) return <Spinner />;
 * if (isCommunityAdmin) return <AdminPanel />;
 * ```
 */
export const useIsCommunityAdmin = (
  communityUID?: string,
  address?: string | Hex,
  options?: UseIsCommunityAdminOptions,
  community?: ICommunityResponse // Optional community object to avoid API calls
) => {
  const signer = useSigner();
  const { isLoggedIn, address: accountAddress } = useWallet();
  const [resolvedCommunity, setResolvedCommunity] =
    useState<ICommunityResponse | null>(null);

  // Use provided address or connected account address
  const checkAddress = address || accountAddress;

  // Determine if input is a community or grant, and resolve community data
  useEffect(() => {
    // If community object is provided, use it directly
    if (community) {
      setResolvedCommunity(community);
      return;
    }

    // Otherwise, fetch community data by UID
    if (!communityUID) {
      setResolvedCommunity(null);
      return;
    }

    let cancelled = false; // Flag to prevent race conditions

    const resolveCommunity = async () => {
      try {
        const response = await gapIndexerApi
          .communityBySlug(communityUID)
          .catch(() => null);

        // Only update state if this effect hasn't been cancelled
        if (!cancelled) {
          const communityData = response?.data || null;
          setResolvedCommunity(communityData);
        }
      } catch (error: any) {
        console.error("Error fetching community data:", error);
        if (!cancelled) {
          setResolvedCommunity(null);
        }
      }
    };

    resolveCommunity();

    // Cleanup function to prevent race conditions
    return () => {
      cancelled = true;
    };
  }, [communityUID, community]);

  const query = useQuery({
    queryKey: [
      "isCommunityAdmin",
      resolvedCommunity?.uid,
      resolvedCommunity?.chainID,
      checkAddress,
      !!isLoggedIn,
      signer,
    ],
    queryFn: async () => {
      if (!resolvedCommunity || !checkAddress || !isLoggedIn) {
        return false;
      }

      return await isCommunityAdminOf(resolvedCommunity, checkAddress, signer);
    },
    enabled: !!resolvedCommunity && options?.enabled !== false,
    ...defaultQueryOptions,
  });

  useEffect(() => {
    if (options?.zustandSync?.setIsCommunityAdmin && !query.isLoading) {
      options.zustandSync.setIsCommunityAdmin(query.data ?? false);
    }
  }, [query.data, query.isLoading, options?.zustandSync?.setIsCommunityAdmin]);

  return {
    isCommunityAdmin: query.data ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

/**
 * Convenience hook specifically for grant-based admin checks with automatic Zustand store synchronization
 *
 * This hook is designed for use in grant-related components where admin status needs to be
 * synchronized with the Zustand store for backwards compatibility.
 *
 * @param communityUID - The community UID associated with the grant
 * @param address - User address to check (defaults to connected account if not provided)
 * @param zustandSync - Zustand store setter functions for synchronization
 * @param zustandSync.setIsCommunityAdmin - Function to update admin status in store
 * @param community - Optional pre-fetched community object to avoid additional API calls
 *
 * @returns Same as useIsCommunityAdmin hook
 *
 * @example
 * ```tsx
 * const { isCommunityAdmin, isLoading } = useGrantCommunityAdmin(
 *   grant.communityUID,
 *   userAddress,
 *   {
 *     setIsCommunityAdmin: useCommunityAdminStore(state => state.setIsCommunityAdmin),
 *   }
 * );
 * ```
 */
export const useGrantCommunityAdmin = (
  communityUID?: string,
  address?: string | Hex,
  zustandSync?: {
    setIsCommunityAdmin?: (isAdmin: boolean) => void;
  },
  community?: ICommunityResponse // Optional community object to avoid API calls
) => {
  return useIsCommunityAdmin(
    communityUID,
    address,
    {
      zustandSync,
    },
    community
  );
};
