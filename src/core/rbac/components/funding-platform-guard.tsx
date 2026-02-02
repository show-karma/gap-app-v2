"use client";

import type { ReactNode } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { layoutTheme } from "@/src/helper/theme";
import { usePermissionContext } from "../context/permission-context";
import { Role } from "../types/role";

interface FundingPlatformGuardProps {
  children: ReactNode;
  communityId: string;
  programId?: string;
}

export function FundingPlatformGuard({
  children,
  communityId,
  programId,
}: FundingPlatformGuardProps) {
  const { isLoading, hasRoleOrHigher, hasReviewerAccessInCommunity } = usePermissionContext();

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  // User has access if they:
  // 1. Have a role at or above MILESTONE_REVIEWER (admin, community admin, program admin, or program-level reviewer), OR
  // 2. Have reviewer access to at least one program in this community (community-level check)
  const hasAccess = hasRoleOrHigher(Role.MILESTONE_REVIEWER) || hasReviewerAccessInCommunity;

  if (!hasAccess) {
    return (
      <div className={layoutTheme.padding}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
            Access Denied
          </h2>
          <p className="text-red-600 dark:text-red-400">
            You don&apos;t have permission to access the funding platform for this community. Please
            contact a community administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function useIsFundingPlatformAdmin(): boolean {
  const { hasRoleOrHigher, isLoading } = usePermissionContext();
  return !isLoading && hasRoleOrHigher(Role.PROGRAM_ADMIN);
}

/**
 * Checks if user has reviewer access to the funding platform.
 * At community level (no programId), checks hasReviewerAccessInCommunity.
 * At program level, checks for actual reviewer roles.
 */
export function useIsFundingPlatformReviewer(): boolean {
  const { roles, isLoading, hasReviewerAccessInCommunity } = usePermissionContext();
  const hasReviewerRole =
    roles.roles.includes(Role.PROGRAM_REVIEWER) || roles.roles.includes(Role.MILESTONE_REVIEWER);
  return !isLoading && (hasReviewerRole || hasReviewerAccessInCommunity);
}
