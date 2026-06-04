"use client";

import { SparklesIcon } from "@heroicons/react/20/solid";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { memo, useCallback, useMemo, useState } from "react";
import { MilestoneCard } from "@/components/Pages/Admin/MilestonesReview/MilestoneCard";
import { Button } from "@/components/Utilities/Button";
import { useMilestoneAllocationsByGrants } from "@/hooks/useCommunityMilestoneAllocations";
import { useMilestoneCompletionVerification } from "@/hooks/useMilestoneCompletionVerification";
import { useMilestoneEvaluation } from "@/hooks/useMilestoneEvaluation";
import { useProjectGrantMilestones } from "@/hooks/useProjectGrantMilestones";
import type { GrantMilestoneWithCompletion, MilestoneEvaluationItem } from "@/services/milestones";
import {
  useIsReviewerType,
  usePermissionContext,
} from "@/src/core/rbac/context/permission-context";
import { ReviewerType } from "@/src/core/rbac/types";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

const MarkdownPreview = dynamic(
  () =>
    import("@/components/Utilities/MarkdownPreview").then((m) => ({ default: m.MarkdownPreview })),
  { ssr: false }
);

/** Strip the optional chainId suffix from program IDs (e.g. "959_42161" -> "959"). */
function parseProgramId(programId: string): string {
  if (programId.includes("_")) {
    const [id] = programId.split("_");
    return id ?? programId;
  }
  return programId;
}

function getRatingColor(rating: number): string {
  if (rating >= 8) return "text-green-700 dark:text-green-300";
  if (rating >= 5) return "text-yellow-700 dark:text-yellow-300";
  return "text-red-700 dark:text-red-300";
}

function getRatingBgColor(rating: number): string {
  if (rating >= 8) return "bg-green-100 dark:bg-green-900/30";
  if (rating >= 5) return "bg-yellow-100 dark:bg-yellow-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

function formatReasoning(text: string): string {
  if (text.includes("\n") || text.includes("**") || text.includes("# ")) {
    return text;
  }
  return text.replace(
    /\.\s+(Relevance:|Evidence\b|Completeness:|Overall:|Strength:|Weakness:|However,|In summary|In conclusion|The (?:milestone|project|grant|evidence|completion|submitted))/g,
    ".\n\n$1"
  );
}

const InlineEvaluationCard = memo(function InlineEvaluationCard({
  evaluation,
}: {
  evaluation: MilestoneEvaluationItem;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-3">
        <div
          className={cn(
            "flex items-baseline gap-1 rounded-full px-3 py-1",
            getRatingBgColor(evaluation.rating)
          )}
        >
          <span className={cn("text-lg font-bold", getRatingColor(evaluation.rating))}>
            {evaluation.rating}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">/ 10</span>
        </div>
      </div>
      <div className="text-sm leading-6 text-gray-700 dark:text-gray-300">
        <MarkdownPreview source={formatReasoning(evaluation.reasoning)} />
      </div>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Evaluated {formatDate(evaluation.createdAt)}
      </p>
    </div>
  );
});

function InlineAIEvaluation({ milestone }: { milestone: GrantMilestoneWithCompletion }) {
  const hasCompletion =
    milestone.completionDetails !== null || milestone.fundingApplicationCompletion !== null;
  const { data, isLoading, error, refetch } = useMilestoneEvaluation(milestone.uid, hasCompletion);
  const evaluations = data?.evaluations ?? [];

  return (
    <section className="rounded-lg bg-gray-50 p-4 dark:bg-zinc-800/60">
      <div className="mb-3 flex items-center gap-2">
        <SparklesIcon className="h-4 w-4 text-purple-600 dark:text-purple-300" />
        <h3 className="text-sm font-semibold text-gray-950 dark:text-white">
          Karma AI Review of Milestone
        </h3>
      </div>
      {!hasCompletion ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          AI review is available after a milestone completion is submitted.
        </p>
      ) : isLoading ? (
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-lg bg-gray-200 dark:bg-zinc-800" />
          <div className="h-16 animate-pulse rounded-lg bg-gray-200 dark:bg-zinc-800" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
          <p className="mb-3 text-sm text-red-700 dark:text-red-300">Failed to load AI review.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : evaluations.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">No AI review available yet.</p>
      ) : (
        <div className="space-y-3">
          {evaluations.map((evaluation) => (
            <InlineEvaluationCard
              key={`${evaluation.milestoneUID}-${evaluation.model}-${evaluation.createdAt}`}
              evaluation={evaluation}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface InboxMilestoneDetailProps {
  /** Project UID (or slug) used to fetch the grant's milestones. */
  projectUid: string;
  /** Program id (supports composite "id_chainId"); identifies the grant. */
  programId: string;
  /** Grant UID — enables on-chain edit affordances inside MilestoneCard. */
  grantUid?: string;
  /** Project slug, for the "mention in chat" affordance. */
  projectSlug?: string;
  /** Project title, for the "mention in chat" affordance. */
  projectTitle?: string;
  /** The milestone to render. Must match one in the fetched grant. */
  milestoneUid: string;
  /** Community id (reserved for parity with the report wiring). */
  communityId: string;
}

export function InboxMilestoneDetail({
  projectUid,
  programId,
  grantUid,
  projectSlug,
  projectTitle,
  milestoneUid,
}: InboxMilestoneDetailProps) {
  const parsedProgramId = useMemo(() => parseProgramId(programId), [programId]);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useProjectGrantMilestones(projectUid, programId);

  const [verifyingMilestoneId, setVerifyingMilestoneId] = useState<string | null>(null);
  const [verificationComment, setVerificationComment] = useState("");

  // Inbox is rendered inside the community-scoped PermissionProvider, so the
  // milestone-reviewer / community-admin flags come from RBAC context.
  const isMilestoneReviewer = useIsReviewerType(ReviewerType.MILESTONE);
  const { isCommunityAdmin, isLoading: isLoadingPermissions } = usePermissionContext();
  const canVerifyMilestones = isCommunityAdmin || isMilestoneReviewer;

  const invalidateInboxFeed = useCallback(() => {
    // Refresh the cross-program Reviewer Inbox feed + header stats. Uses the
    // `["reviewer-inbox"]` prefix to match every community/filter variant.
    queryClient.invalidateQueries({ queryKey: ["reviewer-inbox"] });
  }, [queryClient]);

  const { verifyMilestone, isVerifying } = useMilestoneCompletionVerification({
    projectId: projectUid,
    programId,
    // Fires as soon as the backend state changes (pending_verification ->
    // pending_completion), before the on-chain verification poll resolves — so
    // the item moves out of "Waiting on you" without waiting for full indexing
    // or a page reload.
    onCachesInvalidated: invalidateInboxFeed,
    onSuccess: async () => {
      await refetch();
      // Final refresh once the verification is fully indexed, so the milestone
      // drops from the feed and the counts decrement.
      invalidateInboxFeed();
      setVerifyingMilestoneId(null);
      setVerificationComment("");
    },
  });

  const grant = data?.grant;
  const project = data?.project;
  const milestones = data?.grantMilestones ?? [];

  const selectedMilestone = useMemo(
    () => milestones.find((milestone) => milestone.uid === milestoneUid) ?? null,
    [milestones, milestoneUid]
  );

  const grantUIDsForAllocations = useMemo(() => (grant?.uid ? [grant.uid] : []), [grant?.uid]);
  const { allocationMap } = useMilestoneAllocationsByGrants(grantUIDsForAllocations);

  const handleVerifyClick = useCallback((completionId: string) => {
    setVerifyingMilestoneId(completionId);
    setVerificationComment("");
  }, []);

  const handleCancelVerification = useCallback(() => {
    setVerifyingMilestoneId(null);
    setVerificationComment("");
  }, []);

  const handleSubmitVerification = useCallback(
    async (milestone: GrantMilestoneWithCompletion) => {
      if (!data) return;
      await verifyMilestone(milestone, isMilestoneReviewer, data, verificationComment);
    },
    [data, verifyMilestone, isMilestoneReviewer, verificationComment]
  );

  // Detail panes never delete; deletion lives in the dedicated review page.
  const handleDeleteMilestone = useCallback(async () => {}, []);

  if (isLoading || isLoadingPermissions) {
    return (
      <output aria-label="Loading milestone" className="block animate-pulse space-y-4">
        <span className="block h-6 w-1/3 rounded bg-gray-200 dark:bg-zinc-700" />
        <span className="block h-4 w-1/2 rounded bg-gray-200 dark:bg-zinc-700" />
        <span className="block h-40 w-full rounded bg-gray-200 dark:bg-zinc-700" />
      </output>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
        <h3 className="mb-2 font-semibold text-red-800 dark:text-red-200">
          Error loading milestone
        </h3>
        <p className="mb-3 text-sm text-red-600 dark:text-red-400">
          {error instanceof Error ? error.message : "Failed to load milestone data."}
        </p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!selectedMilestone) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center dark:border-zinc-700">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Milestone not found</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          This milestone may have been removed or is no longer part of this grant.
        </p>
      </div>
    );
  }

  const index = milestones.findIndex((m) => m.uid === selectedMilestone.uid);

  return (
    <div className="space-y-4">
      <MilestoneCard
        key={selectedMilestone.uid}
        milestone={selectedMilestone}
        index={index < 0 ? 0 : index}
        verifyingMilestoneId={verifyingMilestoneId}
        verificationComment={verificationComment}
        isVerifying={isVerifying}
        canVerifyMilestones={canVerifyMilestones}
        canDeleteMilestones={false}
        canEditMilestones={false}
        grantUID={grant?.uid ?? grantUid}
        grantChainID={grant?.chainID}
        projectUid={project?.uid ?? projectUid}
        projectSlug={project?.details?.slug ?? projectSlug}
        projectTitle={project?.details?.title ?? projectTitle}
        programId={parsedProgramId}
        onVerifyClick={handleVerifyClick}
        onCancelVerification={handleCancelVerification}
        onVerificationCommentChange={setVerificationComment}
        onSubmitVerification={handleSubmitVerification}
        onDeleteMilestone={handleDeleteMilestone}
        allocationAmount={
          allocationMap.get(selectedMilestone.uid) ??
          allocationMap.get(selectedMilestone.uid.toLowerCase())
        }
        showAIEvaluationButton={false}
        quietSurface
      />
      <InlineAIEvaluation milestone={selectedMilestone} />
    </div>
  );
}
