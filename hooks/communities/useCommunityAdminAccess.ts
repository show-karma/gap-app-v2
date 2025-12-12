import { useMemo } from "react";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useStaff } from "@/hooks/useStaff";
import { useOwnerStore } from "@/store";
import { useContractOwner } from "../useContractOwner";

interface UseCommunityAdminAccessResult {
  hasAccess: boolean;
  isLoading: boolean;
  checks: {
    isCommunityAdmin: boolean;
    isOwner: boolean;
    isStaff: boolean;
  };
}

/**
 * Unified hook to check if user has admin access to a community
 *
 * Combines three access checks:
 * - Community admin status
 * - Contract owner status
 * - Staff status
 *
 * @param communityId - The community UID or slug
 * @returns Object containing hasAccess flag, loading state, and individual check results
 *
 * @example
 * ```tsx
 * const { hasAccess, isLoading } = useCommunityAdminAccess(communityId);
 *
 * if (isLoading) return <Spinner />;
 * if (!hasAccess) return <AccessDenied />;
 * ```
 */
export const useCommunityAdminAccess = (communityId?: string): UseCommunityAdminAccessResult => {
  const { isCommunityAdmin, isLoading: isCheckingAdmin } = useIsCommunityAdmin(communityId);
  const { isOwner, isOwnerLoading } = useOwnerStore();
  const { isStaff, isLoading: isStaffLoading } = useStaff();

  // Memoize computed values
  const hasAccess = useMemo(
    () => isCommunityAdmin || isOwner || isStaff,
    [isCommunityAdmin, isOwner, isStaff]
  );

  const isLoading = useMemo(
    () => isCheckingAdmin || isStaffLoading || isOwnerLoading,
    [isCheckingAdmin, isStaffLoading]
  );

  const checks = useMemo(
    () => ({ isCommunityAdmin, isOwner, isStaff }),
    [isCommunityAdmin, isOwner, isStaff]
  );

  return {
    hasAccess,
    isLoading,
    checks,
  };
};
