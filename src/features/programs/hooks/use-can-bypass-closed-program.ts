"use client";

import { usePermissionContext } from "@/src/core/rbac/context/permission-context";

interface CanBypassClosedProgram {
  canBypass: boolean;
  isLoading: boolean;
}

/**
 * Whether the current user may apply to a program whose application window is
 * closed (deadline passed, disabled, or outside its start/end range).
 *
 * Mirrors the backend bypass (hasFundingProgramAdminAccess). The indexer folds
 * staff (SUPER_ADMIN) into isCommunityAdmin, so these two BE-resolved flags cover
 * staff, community admins, and program reviewers with no client-side role logic.
 *
 * Requires a <PermissionProvider resourceContext={{ communityId, programId }}>
 * ancestor; outside one it resolves to { canBypass: false, isLoading: true }.
 */
export function useCanBypassClosedProgram(): CanBypassClosedProgram {
  const { isLoading, isCommunityAdmin, isReviewer } = usePermissionContext();
  return {
    canBypass: !isLoading && (isCommunityAdmin || isReviewer),
    isLoading,
  };
}
