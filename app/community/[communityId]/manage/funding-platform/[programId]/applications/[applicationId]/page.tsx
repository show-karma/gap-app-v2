"use client";

import { useParams } from "next/navigation";
import ApplicationDetailView from "@/components/FundingPlatform/ApplicationView/ApplicationDetailView";
import { FundingPlatformGuard } from "@/src/core/rbac";

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

  // Extract normalized programId (remove chainId suffix if present)
  const programId = combinedProgramId.includes("_")
    ? combinedProgramId.split("_")[0]
    : combinedProgramId;

  return (
    <FundingPlatformGuard>
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
