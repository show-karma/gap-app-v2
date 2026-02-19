import { useMemo } from "react";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useAuth } from "@/hooks/useAuth";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { Role } from "@/src/core/rbac/types";
import { useOwnerStore } from "@/store";

interface UseCommunityAdminAccessResult {
  hasAccess: boolean;
  isLoading: boolean;
  checks: {
    isCommunityAdmin: boolean;
    isOwner: boolean;
    isSuperAdmin: boolean;
    isRbacCommunityAdmin: boolean;
  };
}

/**
 * Unified hook to check if user has admin access to a community
 *
 * Combines three access checks:
 * - Community admin status
 * - Contract owner status
 * - Super admin status (RBAC)
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
  const { authenticated } = useAuth();
  const { data: permissions, isLoading: isPermissionsLoading } = usePermissionsQuery(
    communityId ? { communityId } : {},
    { enabled: authenticated }
  );
  const isSuperAdmin = permissions?.roles.roles.includes(Role.SUPER_ADMIN) ?? false;
  const isRbacCommunityAdmin = permissions?.isCommunityAdmin ?? false;

  // Memoize computed values
  const hasAccess = useMemo(
    () => isCommunityAdmin || isOwner || isSuperAdmin || isRbacCommunityAdmin,
    [isCommunityAdmin, isOwner, isSuperAdmin, isRbacCommunityAdmin]
  );

  const isLoading = useMemo(
    () => isCheckingAdmin || isPermissionsLoading || isOwnerLoading,
    [isCheckingAdmin, isPermissionsLoading, isOwnerLoading]
  );

  const checks = useMemo(
    () => ({ isCommunityAdmin, isOwner, isSuperAdmin, isRbacCommunityAdmin }),
    [isCommunityAdmin, isOwner, isSuperAdmin, isRbacCommunityAdmin]
  );

  return {
    hasAccess,
    isLoading,
    checks,
  };
};
