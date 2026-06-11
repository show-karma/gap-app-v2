import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Hex } from "viem";
import { useAuth } from "@/hooks/useAuth";
import { getLinkedWalletAddresses } from "@/utilities/auth/compare-all-wallets";
import { ADMIN_CACHE_CONFIG } from "@/utilities/cache-config";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { getCommunityDetails } from "@/utilities/queries/v2/community";
import { isCommunityAdminOfAny } from "@/utilities/sdk/communities/isCommunityAdmin";

/**
 * Hook to check if the current user is an admin of ANY community in a list.
 *
 * A project may belong to several communities (via its grants). Authority to
 * manage the team should be granted if the user administers any one of them, so
 * each community is resolved on-chain and the result is OR-ed together. Mirrors
 * the multi-wallet handling in `useCheckCommunityAdmin`: the active wallet plus
 * every wallet linked to the Privy account is checked, since admin authority may
 * live on a non-active wallet.
 *
 * @param communityUIDs - Community UIDs the user could be an admin of
 */
export const useIsAdminOfCommunities = (communityUIDs?: string[]) => {
  const signer = useSigner();
  const { authenticated: isAuth, address: accountAddress, user } = useAuth();

  const checkAddresses = useMemo<(string | Hex)[]>(() => {
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
  }, [accountAddress, user]);

  // Order-independent signatures so the query key stays stable across renders.
  const communitiesKey = useMemo(
    () =>
      communityUIDs?.length
        ? Array.from(new Set(communityUIDs.map((uid) => uid.toLowerCase())))
            .sort()
            .join(",")
        : undefined,
    [communityUIDs]
  );
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
    queryKey: ["community", "isAdminOfAny", communitiesKey, walletsKey, !!signer],
    queryFn: async () => {
      if (!communityUIDs?.length || checkAddresses.length === 0 || !isAuth) {
        return false;
      }

      const communities = await Promise.all(
        Array.from(new Set(communityUIDs)).map((uid) => getCommunityDetails(uid))
      );

      const checks = await Promise.all(
        communities
          .filter((community): community is NonNullable<typeof community> => !!community)
          .map((community) => isCommunityAdminOfAny(community, checkAddresses, signer))
      );

      return checks.some(Boolean);
    },
    enabled: !!communityUIDs?.length && checkAddresses.length > 0 && !!isAuth,
    staleTime: ADMIN_CACHE_CONFIG.staleTime,
    gcTime: ADMIN_CACHE_CONFIG.gcTime,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  return {
    isCommunityAdmin: isAuth ? (query.data ?? false) : false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
