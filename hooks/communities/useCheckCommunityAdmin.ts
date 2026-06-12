import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Hex } from "viem";
import { useAuth } from "@/hooks/useAuth";
import type { Community } from "@/types/v2/community";
import { getLinkedWalletAddresses } from "@/utilities/auth/compare-all-wallets";
import { ADMIN_CACHE_CONFIG } from "@/utilities/cache-config";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { isCommunityAdminOfAny } from "@/utilities/sdk/communities/isCommunityAdmin";

interface UseCheckCommunityAdminOptions {
  enabled?: boolean;
}

/**
 * Hook to check if a user is an admin of a community
 *
 * @param community - The community object to check against
 * @param address - User address to check (defaults to connected account)
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const { data: community } = useCommunityDetails('optimism');
 * const { isAdmin, isLoading } = useCheckCommunityAdmin(community);
 * ```
 */
export const useCheckCommunityAdmin = (
  community?: Community | null,
  address?: string | Hex,
  options?: UseCheckCommunityAdminOptions
) => {
  const signer = useSigner();
  const { authenticated: isAuth, address: accountAddress, user } = useAuth();

  // When an explicit address is provided, check exactly that address. Otherwise
  // authorize the whole authenticated account: the active wallet plus every
  // wallet linked to the Privy user. A single account may hold several wallets
  // (e.g. multiple embedded wallets) and admin authority may sit on a non-active
  // one, so checking only the active address can wrongly deny access.
  const checkAddresses = useMemo<(string | Hex)[]>(() => {
    if (address) return [address];
    const seen = new Set<string>();
    const result: (string | Hex)[] = [];
    for (const candidate of [accountAddress, ...(user ? getLinkedWalletAddresses(user) : [])]) {
      if (!candidate) continue;
      const key = candidate.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(candidate);
    }
    return result;
  }, [address, accountAddress, user]);

  // Order-independent signature of the checked set for the query key.
  const walletsKey = useMemo(
    () =>
      checkAddresses.length
        ? checkAddresses
            .map((candidate) => candidate.toLowerCase())
            .sort()
            .join(",")
        : undefined,
    [checkAddresses]
  );

  const query = useQuery({
    queryKey: QUERY_KEYS.COMMUNITY.IS_ADMIN(community?.uid, community?.chainID, walletsKey, signer),
    queryFn: async () => {
      if (!community || checkAddresses.length === 0 || !isAuth) {
        return false;
      }

      return await isCommunityAdminOfAny(community, checkAddresses, signer);
    },
    enabled: !!community && checkAddresses.length > 0 && !!isAuth && options?.enabled !== false,
    staleTime: ADMIN_CACHE_CONFIG.staleTime,
    gcTime: ADMIN_CACHE_CONFIG.gcTime,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  return {
    // Return false immediately if not authenticated (defense-in-depth)
    isAdmin: isAuth ? (query.data ?? false) : false,
    isLoading: query.isLoading,
    // `isPending` is true whenever the query has no data — including while it
    // is disabled waiting on prerequisites. Authorization-resolution logic must
    // read this (not `isLoading`) so a disabled-but-undecided check is not
    // mistaken for resolved-denied under React Query v5.
    isPending: query.isPending,
    hasCandidateWallets: checkAddresses.length > 0,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
