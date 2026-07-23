"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { layoutTheme } from "@/src/helper/theme";
import { usePermissionContext } from "../context/permission-context";
import { Role } from "../types/role";

interface FundingPlatformGuardProps {
  children: ReactNode;
  /**
   * When set, a denied non-reviewer is redirected here instead of seeing the
   * "Access Denied" box (DEV-496). Used to collapse `/manage/funding-platform`
   * links onto the public `/applications/:ref` page for applicants. A denial
   * caused by a failed permission lookup (`isGuestDueToError`) is treated as
   * undetermined and never redirected — it falls through to the denial box.
   */
  onDeniedRedirectTo?: string;
  /**
   * True while `onDeniedRedirectTo` is still being computed asynchronously
   * (e.g. looking up the applicant's matching application). A denied user waits
   * on a spinner rather than flashing the denial box before the target lands.
   */
  redirectResolving?: boolean;
}

export function FundingPlatformGuard({
  children,
  onDeniedRedirectTo,
  redirectResolving = false,
}: FundingPlatformGuardProps) {
  const { isLoading, hasRoleOrHigher, isReviewer, isGuestDueToError } = usePermissionContext();
  const { replace } = useRouter();

  // User has access if they:
  // 1. Have a role at or above MILESTONE_REVIEWER (admin, community admin, program admin, or program-level reviewer), OR
  // 2. Have reviewer access (context-aware: checks community or program level based on current context)
  const hasAccess = hasRoleOrHigher(Role.MILESTONE_REVIEWER) || isReviewer;
  const isDenied = !isLoading && !hasAccess && !isGuestDueToError;
  const shouldRedirect = isDenied && Boolean(onDeniedRedirectTo);
  // A denied user whose redirect target is still resolving waits, so the denial
  // box never flashes before an applicant is bounced to their application.
  const waitingForRedirectTarget = isDenied && redirectResolving && !onDeniedRedirectTo;

  useEffect(() => {
    if (shouldRedirect && onDeniedRedirectTo) {
      replace(onDeniedRedirectTo);
    }
  }, [shouldRedirect, onDeniedRedirectTo, replace]);

  // Spinner while permissions resolve, and while the redirect above is in flight,
  // so a denied applicant never flashes the "Access Denied" box before leaving.
  if (isLoading || shouldRedirect || waitingForRedirectTarget) {
    return (
      <div className="flex w-full items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

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
 * Uses context-aware `isReviewer` which is computed by the backend based on:
 * - Global context: true if reviewer in any program
 * - Community context: true if reviewer in any program of that community
 * - Program context: true if reviewer in that specific program
 */
export function useIsFundingPlatformReviewer(): boolean {
  const { isLoading, isReviewer } = usePermissionContext();
  return !isLoading && isReviewer;
}
