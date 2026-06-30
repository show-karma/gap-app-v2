"use client";

import { useParams } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { useFundingApplicationByProjectUID } from "@/hooks/useFundingApplicationByProjectUID";
import { layoutTheme } from "@/src/helper/theme";
import { buildGranteeRedirect } from "@/utilities/fundingPlatformUrls";
import { useWhitelabel } from "@/utilities/whitelabel-context";
import { usePermissionContext } from "../context/permission-context";
import { useGranteeApplicationAccess } from "../hooks/use-grantee-application-access";
import { Role } from "../types/role";
import { GranteeRedirectNotice } from "./grantee-redirect-notice";

interface FundingPlatformGuardProps {
  children: ReactNode;
}

function GuardSpinner() {
  return (
    <div className="flex w-full items-center justify-center min-h-[400px]">
      <Spinner />
    </div>
  );
}

function GenericDenied() {
  return (
    <div className={layoutTheme.padding}>
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">Access Denied</h2>
        <p className="text-red-600 dark:text-red-400">
          You don&apos;t have permission to access the funding platform for this community. Please
          contact a community administrator if you believe this is an error.
        </p>
      </div>
    </div>
  );
}

// Resolve the origin via a lazy initializer (not an effect) so redirect hrefs are
// correct on the first client render. Undefined only during SSR / non-whitelabel.
function useWhitelabelOrigin() {
  const { isWhitelabel } = useWhitelabel();
  const [clientOrigin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : undefined
  );
  return { isWhitelabel, whitelabelOrigin: isWhitelabel ? clientOrigin : undefined };
}

// Grantee responsible for THIS project (milestones review route): send them to
// that project's application instead of the generic denial.
function ProjectOwnerRedirect() {
  const params = useParams() as { communityId?: string; projectId?: string };
  const { communityId, projectId } = params;
  const { isWhitelabel, whitelabelOrigin } = useWhitelabelOrigin();
  const { application, isLoading } = useFundingApplicationByProjectUID(projectId || "");

  // Wait for the application link (and whitelabel origin) so the redirect target
  // is correct on first paint — no denial flash.
  if (isLoading || (isWhitelabel && !whitelabelOrigin)) {
    return <GuardSpinner />;
  }

  // Ownership is already confirmed via RBAC, so an unresolved or errored
  // application lookup still routes to the dashboard (a valid grantee
  // destination) rather than the generic denial.
  const referenceNumber = application?.referenceNumber;
  const redirect = buildGranteeRedirect({
    communityId,
    referenceNumber,
    applicationCount: referenceNumber ? 1 : 0,
    whitelabelOrigin,
  });
  return <GranteeRedirectNotice redirect={redirect} />;
}

// Applicant fallback for pages without a project in context (program list,
// applications, setup, question-builder) and for grantees who aren't the
// on-chain project owner: detect any application in this program/community.
function ApplicantRedirect() {
  const params = useParams() as { communityId?: string; programId?: string };
  const { communityId, programId } = params;
  const { isWhitelabel, whitelabelOrigin } = useWhitelabelOrigin();
  const grantee = useGranteeApplicationAccess({
    enabled: true,
    communityId,
    programId,
    whitelabelOrigin,
  });

  if (grantee.isResolving || (isWhitelabel && !whitelabelOrigin)) {
    return <GuardSpinner />;
  }
  if (grantee.isGrantee && !grantee.isError) {
    return <GranteeRedirectNotice redirect={grantee.redirect} />;
  }
  return <GenericDenied />;
}

// Only mounts once the user is denied, so the application lookups never run for
// authorized reviewers/admins.
function DeniedAccessView() {
  const { isProjectOwner } = usePermissionContext();
  return isProjectOwner ? <ProjectOwnerRedirect /> : <ApplicantRedirect />;
}

export function FundingPlatformGuard({ children }: FundingPlatformGuardProps) {
  const { isLoading, hasRoleOrHigher, isReviewer } = usePermissionContext();

  // User has access if they:
  // 1. Have a role at or above MILESTONE_REVIEWER (admin, community admin, program admin, or program-level reviewer), OR
  // 2. Have reviewer access (context-aware: checks community or program level based on current context)
  const hasAccess = hasRoleOrHigher(Role.MILESTONE_REVIEWER) || isReviewer;

  if (isLoading) {
    return <GuardSpinner />;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  return <DeniedAccessView />;
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
