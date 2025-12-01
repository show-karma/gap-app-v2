"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProgramScoresUpload } from "@/components/Pages/Admin/ProgramScoresUpload";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityDetails } from "@/hooks/useCommunityDetails";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { useStaff } from "@/hooks/useStaff";
import { useOwnerStore } from "@/store";
import { MESSAGES } from "@/utilities/messages";

export default function ProgramScoresPage() {
  const { communityId } = useParams() as { communityId: string };

  const { isCommunityAdmin, isLoading: isCheckingAdmin } = useIsCommunityAdmin(communityId);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isStaff } = useStaff();

  const hasAccess = isCommunityAdmin || isOwner || isStaff;
  const { data: programs, isLoading: isProgramsLoading } = useCommunityPrograms(communityId);
  const { data: community, isLoading: isCommunityLoading } = useCommunityDetails(communityId);

  if (isCheckingAdmin || isProgramsLoading || isCommunityLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-600">{MESSAGES.ADMIN.NOT_AUTHORIZED(communityId)}</p>
      </div>
    );
  }

  return (
    <div className="max-w-full w-full">
      <div className="mb-8">
        <Link
          href={`/community/${communityId}/admin`}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-500 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Admin Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-primary">Program Scores Upload</h1>
        <p className="text-foreground mt-2">
          Upload CSV files containing program participant scores for evaluation and tracking.
        </p>
      </div>

      <ProgramScoresUpload
        communityUID={community?.uid || communityId}
        programs={programs || []}
        defaultChainId={community?.chainID}
      />
    </div>
  );
}
