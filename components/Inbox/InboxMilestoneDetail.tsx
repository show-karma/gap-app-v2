"use client";

import {
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  RectangleStackIcon,
  SparklesIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/20/solid";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import pluralize from "pluralize";
import { type FC, memo, useCallback, useMemo, useState } from "react";
import { ATTENTION_META, STAGE_AGE_LABEL } from "@/components/Inbox/attentionMeta";
import { MilestoneActionItems } from "@/components/Inbox/MilestoneActionItems";
import { MilestoneTimeline } from "@/components/Inbox/MilestoneTimeline";
import { describeFollowUp } from "@/components/Inbox/stageAge";
import { CommentsAndActivity } from "@/components/Pages/Admin/MilestonesReview/CommentsAndActivity";
import { GrantCommentsAndActivity } from "@/components/Pages/Admin/MilestonesReview/GrantCommentsAndActivity";
import { MilestoneCard } from "@/components/Pages/Admin/MilestonesReview/MilestoneCard";
import { Button } from "@/components/Utilities/Button";
import { Button as UiButton } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMilestoneAllocationsByGrants } from "@/hooks/useCommunityMilestoneAllocations";
import { useFundingApplicationByProjectUID } from "@/hooks/useFundingApplicationByProjectUID";
import { useMilestoneCompletionVerification } from "@/hooks/useMilestoneCompletionVerification";
import { useMilestoneEvaluation } from "@/hooks/useMilestoneEvaluation";
import { useProjectGrantMilestones } from "@/hooks/useProjectGrantMilestones";
import type { GrantMilestoneWithCompletion, MilestoneEvaluationItem } from "@/services/milestones";
import {
  useIsReviewerType,
  usePermissionContext,
} from "@/src/core/rbac/context/permission-context";
import { ReviewerType } from "@/src/core/rbac/types";
import type { MilestoneAttentionReason } from "@/types/funding-platform";
import { formatDate } from "@/utilities/formatDate";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { InboxMilestoneSimocracyTab } from "./InboxMilestoneSimocracyTab";

const MarkdownPreview = dynamic(
  () =>
    import("@/components/Utilities/MarkdownPreview").then((m) => ({ default: m.MarkdownPreview })),
  { ssr: false }
);

/** Detail-pane tabs, mirroring the milestone-review page. */
const PANEL_TABS = [
  { key: "details" as const, label: "Details", icon: DocumentTextIcon },
  { key: "ai" as const, label: "AI Review", icon: SparklesIcon },
  { key: "comments" as const, label: "Comments", icon: ChatBubbleLeftRightIcon },
  { key: "simocracy" as const, label: "Simocracy", icon: UserGroupIcon },
];

type PanelTabKey = (typeof PANEL_TABS)[number]["key"];

/** Roving-tabindex keyboard pattern for the detail tabs (arrows, Home, End). */
function moveTabFocus(
  event: React.KeyboardEvent<HTMLButtonElement>,
  activate: (next: PanelTabKey) => void
): void {
  const keys = PANEL_TABS.map((tab) => tab.key);
  const current = keys.indexOf(event.currentTarget.id.replace("inbox-ms-tab-", "") as PanelTabKey);
  if (current < 0) return;
  const steps: Record<string, number> = {
    ArrowRight: 1,
    ArrowLeft: -1,
    Home: -current,
    End: keys.length - 1 - current,
  };
  const step = steps[event.key];
  if (step === undefined || step === 0) return;
  event.preventDefault();
  const next = keys[(current + step + keys.length) % keys.length];
  activate(next);
  document.getElementById(`inbox-ms-tab-${next}`)?.focus();
}

/** Strip the optional chainId suffix from program IDs (e.g. "959_42161" -> "959"). */
function parseProgramId(programId: string): string {
  if (programId.includes("_")) {
    const [id] = programId.split("_");
    return id ?? programId;
  }
  return programId;
}

/**
 * The application form has no canonical team field — programs label it
 * themselves — so surface the first answer whose question mentions "team".
 */
function extractTeamName(applicationData?: Record<string, unknown> | null): string | null {
  if (!applicationData) return null;
  for (const [label, value] of Object.entries(applicationData)) {
    if (label.toLowerCase().includes("team") && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
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
  const hasCompletion = milestone.completionDetails !== null;
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
          <div className="h-16 animate-pulse motion-reduce:animate-none rounded-lg bg-gray-200 dark:bg-zinc-800" />
          <div className="h-16 animate-pulse motion-reduce:animate-none rounded-lg bg-gray-200 dark:bg-zinc-800" />
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

/**
 * Comments & activity tab for the inbox milestone detail. Mirrors the
 * milestone-review page: the thread is keyed on the grantee's funding
 * application (resolved by project UID), falling back to the grant-level
 * thread when no application reference exists. The funding application is
 * fetched lazily — only when this tab is mounted.
 */
function MilestoneCommentsTab({
  projectUID,
  programId,
  communityId,
}: {
  projectUID: string;
  programId: string;
  communityId: string;
}) {
  const { address } = useAuth();
  const {
    application: fundingApplication,
    isLoading,
    error,
    refetch,
  } = useFundingApplicationByProjectUID(projectUID || "");
  const referenceNumber = fundingApplication?.referenceNumber;

  if (isLoading && !referenceNumber) {
    return (
      <output
        aria-label="Loading comments"
        className="block animate-pulse motion-reduce:animate-none space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <span className="block h-5 w-40 rounded bg-gray-200 dark:bg-zinc-700" />
        <span className="block h-4 w-full rounded bg-gray-100 dark:bg-zinc-800" />
        <span className="block h-4 w-3/4 rounded bg-gray-100 dark:bg-zinc-800" />
      </output>
    );
  }

  if (error && !referenceNumber) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
        <p className="mb-3 text-sm text-red-700 dark:text-red-300">Failed to load comments.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (referenceNumber) {
    return (
      <CommentsAndActivity
        referenceNumber={referenceNumber}
        statusHistory={(fundingApplication?.statusHistory || []).map((item) => ({
          status: item.status,
          timestamp:
            typeof item.timestamp === "string" ? item.timestamp : item.timestamp.toISOString(),
          reason: item.reason,
        }))}
        communityId={communityId}
        currentUserAddress={address}
        programId={programId}
        embedded
      />
    );
  }

  if (projectUID) {
    return (
      <GrantCommentsAndActivity
        projectUID={projectUID}
        programId={programId}
        communityId={communityId}
        currentUserAddress={address}
        referenceNumber={referenceNumber}
        embedded
      />
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center dark:border-zinc-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Comments are not available until the project data finishes loading.
      </p>
    </div>
  );
}

/**
 * Pinned header for a queued milestone.
 *
 * One milestone legitimately carries three statuses at once — a verification
 * state ("Verified"), an application state ("Approved") and a queue stage
 * ("Invoice unpaid") — and the detail pane shows all three in different
 * places. Read cold they look like contradictions, and a reviewer who sees
 * "Verified" concludes there is nothing to do. Leading with the queue stage,
 * the time spent in it and the next follow-up makes the other two read as
 * history rather than conflict.
 *
 * The follow-up date is here because the queue can be ORDERED by it: the key a
 * list is sorted on has to be visible on the thing you opened from that list.
 */
const QueueHeader: FC<{
  reason: MilestoneAttentionReason;
  stageAgeDays?: number;
  nextFollowUpAt?: string | null;
}> = ({ reason, stageAgeDays, nextFollowUpAt }) => {
  const followUp = describeFollowUp(nextFollowUpAt, (iso) => formatDate(iso, "UTC"));

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
          ATTENTION_META[reason].badgeClass
        )}
      >
        {ATTENTION_META[reason].label}
      </span>

      {typeof stageAgeDays === "number" && (
        <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {stageAgeDays} {pluralize("day", stageAgeDays)} {STAGE_AGE_LABEL[reason]}
        </span>
      )}

      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-[13px]",
          followUp.overdue ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
        )}
      >
        <CalendarDaysIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {followUp.scheduled ? `Follow-up ${followUp.label}` : followUp.label}
      </span>
    </div>
  );
};

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
  /** Program (grant round) name — shown beside the project in the header. */
  programName?: string;
  /** The milestone to render. Must match one in the fetched grant. */
  milestoneUid: string;
  /** Community id — scopes the comments/activity thread. */
  communityId: string;
  /** Render the admin-only timeline and follow-up log. Decided by the page. */
  showAdminTools?: boolean;
  /** Admin queue: the stage that put this milestone in the queue. */
  attentionReason?: MilestoneAttentionReason;
  /** Whole days spent in that stage. */
  stageAgeDays?: number;
  /** Admin queue: next scheduled chase, the key the queue can be sorted on. */
  nextFollowUpAt?: string | null;
}

export function InboxMilestoneDetail({
  projectUid,
  programId,
  grantUid,
  projectSlug,
  projectTitle,
  programName,
  milestoneUid,
  communityId,
  showAdminTools = false,
  attentionReason,
  stageAgeDays,
  nextFollowUpAt,
}: InboxMilestoneDetailProps) {
  const parsedProgramId = useMemo(() => parseProgramId(programId), [programId]);
  const queryClient = useQueryClient();
  const [activePanelTab, setActivePanelTab] = useState<PanelTabKey>("details");
  const handleTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) =>
      moveTabFocus(event, (next) => setActivePanelTab(next)),
    []
  );

  const { data, isLoading, error, refetch } = useProjectGrantMilestones(projectUid, programId);
  const { application } = useFundingApplicationByProjectUID(projectUid);

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
      <output
        aria-label="Loading milestone"
        className="block animate-pulse motion-reduce:animate-none space-y-4"
      >
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

  const detailProjectTitle = project?.details?.title ?? projectTitle;
  const detailProjectSlug = project?.details?.slug ?? projectSlug ?? project?.uid ?? projectUid;
  const detailGrantUid = grant?.uid ?? grantUid;
  const detailTeamName = extractTeamName(application?.applicationData);

  return (
    <div className="space-y-4">
      {(detailProjectTitle || programName || detailTeamName || detailGrantUid) && (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              {detailProjectTitle &&
                (detailProjectSlug ? (
                  <Link
                    href={PAGES.PROJECT.OVERVIEW(detailProjectSlug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex w-max max-w-full items-center gap-1.5 text-base font-semibold text-gray-900 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-white dark:hover:text-primary-300"
                  >
                    <FolderOpenIcon
                      className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400"
                      aria-hidden="true"
                    />
                    <span className="truncate">{detailProjectTitle}</span>
                    <ArrowTopRightOnSquareIcon
                      className="h-3.5 w-3.5 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-base font-semibold text-gray-900 dark:text-white">
                    <FolderOpenIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                    <span className="truncate">{detailProjectTitle}</span>
                  </span>
                ))}
              {programName && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-zinc-800 dark:text-gray-300">
                  <RectangleStackIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{programName}</span>
                </span>
              )}
            </div>
            {detailTeamName && (
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <UsersIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{detailTeamName}</span>
              </span>
            )}
          </div>
          {detailGrantUid && detailProjectSlug && (
            <Link
              href={PAGES.PROJECT.GRANT(detailProjectSlug, detailGrantUid)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-primary-400 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-300 dark:hover:border-primary-600 dark:hover:text-primary-300"
            >
              View grant
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
      <div className="sticky top-0 z-10 -mx-1 border-b border-gray-200 bg-white px-1 pt-1 dark:border-zinc-700 dark:bg-zinc-900">
        {attentionReason && (
          <div className="pb-2">
            <QueueHeader
              reason={attentionReason}
              stageAgeDays={stageAgeDays}
              nextFollowUpAt={nextFollowUpAt}
            />
          </div>
        )}

        <div
          role="tablist"
          aria-label="Milestone detail sections"
          className="-mb-px flex max-w-full items-center gap-1 overflow-x-auto"
        >
          {PANEL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePanelTab === tab.key;
            return (
              <UiButton
                key={tab.key}
                type="button"
                variant="ghost"
                size="chip"
                role="tab"
                id={`inbox-ms-tab-${tab.key}`}
                aria-selected={isActive}
                aria-controls={`inbox-ms-panel-${tab.key}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActivePanelTab(tab.key)}
                onKeyDown={handleTabKeyDown}
                className={cn(
                  "shrink-0 rounded-none border-b-2 border-transparent px-3 font-medium focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500",
                  isActive
                    ? "border-gray-900 text-gray-950 hover:bg-transparent dark:border-gray-100 dark:text-white"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </UiButton>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`inbox-ms-panel-${activePanelTab}`}
        aria-labelledby={`inbox-ms-tab-${activePanelTab}`}
      >
        {activePanelTab === "details" && (
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
            {showAdminTools && (
              <>
                <MilestoneTimeline communityId={communityId} milestoneUid={milestoneUid} />
                <MilestoneActionItems communityId={communityId} milestoneUid={milestoneUid} />
              </>
            )}
          </div>
        )}
        {activePanelTab === "ai" && <InlineAIEvaluation milestone={selectedMilestone} />}
        {activePanelTab === "comments" && (
          <MilestoneCommentsTab
            projectUID={project?.uid ?? projectUid}
            programId={parsedProgramId}
            communityId={communityId}
          />
        )}
        {activePanelTab === "simocracy" && (
          <InboxMilestoneSimocracyTab
            projectUID={project?.uid ?? projectUid}
            milestone={{ uid: selectedMilestone.uid, title: selectedMilestone.title }}
          />
        )}
      </div>
    </div>
  );
}
