"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import ApplicationDetailView from "@/components/FundingPlatform/ApplicationView/ApplicationDetailView";
import { Spinner } from "@/components/Utilities/Spinner";
import { FundingPlatformGuard } from "@/src/core/rbac";
import { getApplicationDetailUrl } from "@/utilities/fundingPlatformUrls";
import { useWhitelabel } from "@/utilities/whitelabel-context";

function ApplicationDetailPageContent() {
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

export default function ApplicationDetailPage() {
  // useSearchParams must sit under a Suspense boundary so it doesn't force the
  // whole route into client-side rendering (react-doctor: nextjs-no-use-search-params-without-suspense).
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center min-h-[400px]">
          <Spinner />
        </div>
      }
    >
      <ApplicationDetailPageContent />
    </Suspense>
  );
}
