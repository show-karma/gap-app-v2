"use client";

import { useParams, useSearchParams } from "next/navigation";
import { MilestonesReviewPage } from "@/components/Pages/Admin/MilestonesReview";
import { Spinner } from "@/components/Utilities/Spinner";
import { FundingPlatformGuard } from "@/src/core/rbac";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";

export default function Page() {
  const params = useParams() as {
    communityId: string;
    programId: string;
    projectId: string;
  };
  const searchParams = useSearchParams();

  const { communityId, programId, projectId } = params;
  const from = searchParams.get("from") || undefined;

  const { isLoading } = usePermissionContext();

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  return (
    <FundingPlatformGuard>
      <MilestonesReviewPage
        communityId={communityId}
        projectId={projectId}
        programId={programId}
        referrer={from}
      />
    </FundingPlatformGuard>
  );
}
