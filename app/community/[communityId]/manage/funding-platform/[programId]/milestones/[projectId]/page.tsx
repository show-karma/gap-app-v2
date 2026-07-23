"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MilestonesReviewPage } from "@/components/Pages/Admin/MilestonesReview";
import { Spinner } from "@/components/Utilities/Spinner";
import { FundingPlatformGuard } from "@/src/core/rbac";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { useGranteeMilestoneRedirect } from "@/src/core/rbac/hooks/use-grantee-milestone-redirect";
import { useWhitelabel } from "@/utilities/whitelabel-context";

export default function Page() {
  const params = useParams() as {
    communityId: string;
    programId: string;
    projectId: string;
  };
  const searchParams = useSearchParams();

  const { communityId, programId: combinedProgramId, projectId } = params;
  const from = searchParams.get("from") || undefined;

  const normalizedProgramId = combinedProgramId.includes("_")
    ? combinedProgramId.split("_")[0]
    : combinedProgramId;

  const { isWhitelabel } = useWhitelabel();
  const [clientOrigin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : undefined
  );
  const whitelabelOrigin = isWhitelabel ? clientOrigin : undefined;

  const { isLoading } = usePermissionContext();

  // DEV-496: a non-reviewer who owns the application for this project is bounced
  // to their canonical /applications/:ref?tab=milestones; everyone else (pure
  // public, or an applicant with no app for this project) sees the denial box.
  const { isResolving, redirectUrl } = useGranteeMilestoneRedirect({
    enabled: !isLoading,
    communityId,
    programId: normalizedProgramId,
    projectUid: projectId,
    whitelabelOrigin,
  });

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  return (
    <FundingPlatformGuard
      onDeniedRedirectTo={redirectUrl ?? undefined}
      redirectResolving={isResolving}
    >
      <MilestonesReviewPage
        communityId={communityId}
        projectId={projectId}
        programId={combinedProgramId}
        referrer={from}
      />
    </FundingPlatformGuard>
  );
}
