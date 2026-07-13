"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import ApplicationDetailView from "@/components/FundingPlatform/ApplicationView/ApplicationDetailView";
import { FundingPlatformGuard } from "@/src/core/rbac";
import { getApplicationDetailUrl } from "@/utilities/fundingPlatformUrls";
import { useWhitelabel } from "@/utilities/whitelabel-context";

export default function ApplicationDetailPage() {
  const {
    communityId,
    programId: combinedProgramId,
    applicationId,
  } = useParams() as {
    communityId: string;
    programId: string;
    applicationId: string;
  };
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? undefined;

  const { isWhitelabel } = useWhitelabel();
  const [clientOrigin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : undefined
  );
  const whitelabelOrigin = isWhitelabel ? clientOrigin : undefined;

  // Extract normalized programId (remove chainId suffix if present)
  const programId = combinedProgramId.includes("_")
    ? combinedProgramId.split("_")[0]
    : combinedProgramId;

  // DEV-496: an applicant (or logged-out visitor) handed this reviewer URL is
  // sent to the canonical public application page for the same reference. The
  // applicationId param IS the (globally unique) reference number, so the
  // redirect targets the same entity regardless of whether it is the viewer's own.
  const applicantRedirect = getApplicationDetailUrl(communityId, applicationId, whitelabelOrigin, {
    tab,
  });

  return (
    <FundingPlatformGuard onDeniedRedirectTo={applicantRedirect}>
      <ApplicationDetailView
        applicationId={applicationId}
        programId={programId}
        combinedProgramId={combinedProgramId}
        communityId={communityId}
        variant="page"
      />
    </FundingPlatformGuard>
  );
}
