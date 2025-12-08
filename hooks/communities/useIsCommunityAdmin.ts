import { useEffect } from "react";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { useCheckCommunityAdmin } from "@/hooks/communities/useCheckCommunityAdmin";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";

interface UseIsCommunityAdminOptions {
  enabled?: boolean;
  zustandSync?: {
    setIsCommunityAdmin?: (isAdmin: boolean) => void;
  };
}

/**
 * Hook to check if the current user is an admin of a community
 *
 * Composes useCommunityDetails and useCheckCommunityAdmin hooks.
 *
 * @param communityUIDorSlug - The community UID or slug
 * @param address - User address to check (defaults to connected account)
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const { isCommunityAdmin, isLoading } = useIsCommunityAdmin('optimism');
 * ```
 */
export const useIsCommunityAdmin = (
  communityUIDorSlug?: string,
  userAddress?: string | Hex,
  options?: UseIsCommunityAdminOptions
) => {
  const { address: accountAddress } = useAccount();
  const address = userAddress || accountAddress;
  const communityQuery = useCommunityDetails(communityUIDorSlug);

  const adminQuery = useCheckCommunityAdmin(communityQuery.data, address, {
    enabled: options?.enabled,
  });

  useEffect(() => {
    if (options?.zustandSync?.setIsCommunityAdmin && !adminQuery.isLoading) {
      options.zustandSync.setIsCommunityAdmin(adminQuery.isAdmin);
    }
  }, [adminQuery.isAdmin, adminQuery.isLoading, options?.zustandSync]);

  const isLoading = communityQuery.isLoading || (!!communityQuery.data && adminQuery.isLoading);

  return {
    isCommunityAdmin: adminQuery.isAdmin,
    isLoading,
    isError: communityQuery.isError || adminQuery.isError,
    error: communityQuery.error || adminQuery.error,
    refetch: adminQuery.refetch,
  };
};
