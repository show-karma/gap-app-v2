import { useQuery } from "@tanstack/react-query";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
import type { Community } from "@/types/v2/community";
import { ADMIN_CACHE_CONFIG } from "@/utilities/cache-config";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";

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
  const { address: accountAddress } = useAccount();
  const signer = useSigner();
  const { authenticated: isAuth } = useAuth();

  const checkAddress = address || accountAddress;

  const query = useQuery({
    queryKey: QUERY_KEYS.COMMUNITY.IS_ADMIN(
      community?.uid,
      community?.chainID,
      checkAddress,
      signer
    ),
    queryFn: async () => {
      if (!community || !checkAddress || !isAuth) {
        return false;
      }

      return await isCommunityAdminOf(community, checkAddress, signer);
    },
    enabled: !!community && !!checkAddress && !!isAuth && options?.enabled !== false,
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
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
