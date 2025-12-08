import { useQuery } from "@tanstack/react-query";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
import type { CommunityDetailsV2 } from "@/types/community";
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
  community?: CommunityDetailsV2 | null,
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
      !!isAuth,
      signer
    ),
    queryFn: async () => {
      if (!community || !checkAddress || !isAuth) {
        return false;
      }

      return await isCommunityAdminOf(community, checkAddress, signer);
    },
    enabled: !!community && !!checkAddress && !!isAuth && options?.enabled !== false,
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: 1,
  });

  return {
    isAdmin: query.data ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
