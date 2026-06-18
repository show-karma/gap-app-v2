import { useEffect } from "react";
import type { Hex } from "viem";
import { useCheckCommunityAdmin } from "@/hooks/communities/useCheckCommunityAdmin";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { useAuth } from "@/hooks/useAuth";

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
  const { address: accountAddress, authenticated } = useAuth();
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

  // isPending-aware resolution state for authorization gating (React Query v5).
  // Stays `true` through the full chain — community fetch then admin check —
  // even while a downstream query is disabled-with-prerequisites-pending, so a
  // disabled-but-undecided admin check is never read as resolved-denied.
  // Treated as resolved (not loading) for: unauthenticated users, a missing
  // community arg, a failed community fetch, and accounts with no candidate
  // wallets — none of those can ever flip to admin, so stranding a consumer in
  // a skeleton there would be a bug.
  const isResolving =
    !!authenticated &&
    !!communityUIDorSlug &&
    !(communityQuery.isError || adminQuery.isError) &&
    adminQuery.hasCandidateWallets &&
    (communityQuery.isPending || (!!communityQuery.data && adminQuery.isPending));

  return {
    isCommunityAdmin: adminQuery.isAdmin,
    isLoading,
    isResolving,
    isError: communityQuery.isError || adminQuery.isError,
    error: communityQuery.error || adminQuery.error,
    refetch: adminQuery.refetch,
  };
};
