"use client";

import { Button } from "@/components/ui/button";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useFundingApplicationByProjectUID } from "@/hooks/useFundingApplicationByProjectUID";
import { useOwnerStore } from "@/store";
import { ReviewerDiscussionTab } from "./ReviewerDiscussionTab";

interface MilestoneReviewerDiscussionProps {
  projectUID: string;
  /** Program id without the chain suffix. */
  programId: string;
  communityId: string;
}

/**
 * Reviewer Discussion on milestone review surfaces, which only render for
 * reviewers and admins. The thread belongs to the grant's application.
 */
export function MilestoneReviewerDiscussion({
  projectUID,
  programId,
  communityId,
}: MilestoneReviewerDiscussionProps) {
  const { address } = useAuth();
  const { isCommunityAdmin } = useIsCommunityAdmin(communityId);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const { application, isLoading, error, refetch } = useFundingApplicationByProjectUID(
    projectUID,
    programId
  );

  if (isLoading) {
    return (
      <output
        aria-label="Loading reviewer discussion"
        className="block animate-pulse motion-reduce:animate-none space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <span className="block h-5 w-40 rounded bg-gray-200 dark:bg-zinc-700" />
        <span className="block h-4 w-full rounded bg-gray-100 dark:bg-zinc-800" />
        <span className="block h-4 w-3/4 rounded bg-gray-100 dark:bg-zinc-800" />
      </output>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
        <p className="mb-3 text-sm text-red-700 dark:text-red-300">
          Failed to load the linked application.
        </p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!application?.referenceNumber) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center dark:border-zinc-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Reviewer Discussion is available for grants that came in through an application.
        </p>
      </div>
    );
  }

  return (
    <ReviewerDiscussionTab
      referenceNumber={application.referenceNumber}
      programId={programId}
      canView
      isAdmin={isCommunityAdmin || isContractOwner}
      currentUserAddress={address}
    />
  );
}
