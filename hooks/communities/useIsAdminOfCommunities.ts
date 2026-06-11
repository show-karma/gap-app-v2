import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Hex } from "viem";
import { useAuth } from "@/hooks/useAuth";
import { isAdminOfAnyCommunity } from "@/services/community-admins.service";
import { getLinkedWalletAddresses } from "@/utilities/auth/compare-all-wallets";
import { ADMIN_CACHE_CONFIG } from "@/utilities/cache-config";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Hook to check if the current user is an admin of ANY community in a list.
 *
 * A project may belong to several communities (via its grants). Authority to
 * manage the team should be granted if the user administers any one of them.
 * The on-chain resolution is delegated to `isAdminOfAnyCommunity`; this hook
 * only owns the React Query wiring and the multi-wallet handling (mirroring
 * `useCheckCommunityAdmin`): the active wallet plus every wallet linked to the
 * Privy account is checked, since admin authority may live on a non-active one.
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
    queryKey: QUERY_KEYS.COMMUNITY.IS_ADMIN_OF_ANY(communitiesKey, walletsKey, signer),
    queryFn: () => isAdminOfAnyCommunity(communityUIDs ?? [], checkAddresses, signer),
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
