"use client";

import { useParams } from "next/navigation";
import { ProgramScoresUpload } from "@/components/Pages/Admin/ProgramScoresUpload";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { AccessDenied } from "@/src/components/ui/AccessDenied";
import { communityAdminDenial } from "@/src/components/ui/access-denied-presets";

export default function ProgramScoresPage() {
  const { communityId } = useParams() as { communityId: string };

  const { hasAccess, isLoading: isCheckingAccess } = useCommunityAdminAccess(communityId);
  const { data: programs, isLoading: isProgramsLoading } = useCommunityPrograms(communityId);
  const { data: community, isLoading: isCommunityLoading } = useCommunityDetails(communityId);

  if (isCheckingAccess || isProgramsLoading || isCommunityLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        {...communityAdminDenial(community?.details?.name)}
        communitySlug={community?.details?.slug || community?.uid}
        communityName={community?.details?.name}
      />
    );
  }

  return (
    <div className="max-w-full w-full">
      <div className="mb-8">
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
