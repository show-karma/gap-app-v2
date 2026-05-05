"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  AtSymbolIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "@heroicons/react/20/solid";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/Utilities/Button";
import { Badge } from "@/components/ui/badge";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useMilestoneAllocationsByGrants } from "@/hooks/useCommunityMilestoneAllocations";
import { useDeleteMilestone } from "@/hooks/useDeleteMilestone";
import { useFundingApplicationByProjectUID } from "@/hooks/useFundingApplicationByProjectUID";
import { useMilestoneCompletionVerification } from "@/hooks/useMilestoneCompletionVerification";
import { useMilestoneEvaluation } from "@/hooks/useMilestoneEvaluation";
import { useProjectGrantMilestones } from "@/hooks/useProjectGrantMilestones";
import type { GrantMilestoneWithCompletion, MilestoneEvaluationItem } from "@/services/milestones";
import { Link } from "@/src/components/navigation/Link";
import {
  PermissionProvider,
  useIsReviewer,
  useIsReviewerType,
  usePermissionContext,
} from "@/src/core/rbac/context/permission-context";
import { ReviewerType } from "@/src/core/rbac/types";
import { useAgentChatStore } from "@/store/agentChat";
import { formatDate } from "@/utilities/formatDate";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { CommentsAndActivity } from "./CommentsAndActivity";
import { GrantCommentsAndActivity } from "./GrantCommentsAndActivity";
import { MilestoneCard } from "./MilestoneCard";
import {
  FILTER_TABS,
  getMilestoneStatus,
  MILESTONE_STATUS_CONFIG,
  type MilestoneFilterKey,
  MilestoneReviewStatus,
  type StatusIconName,
  sortMilestones,
} from "./utils/milestone-review-status";

const EMPTY_MILESTONES: GrantMilestoneWithCompletion[] = [];

const MarkdownPreview = dynamic(
  () =>
    import("@/components/Utilities/MarkdownPreview").then((m) => ({ default: m.MarkdownPreview })),
  { ssr: false }
);

function extractCompletionCriteriaByTitle(
  applicationData: Record<string, unknown> | undefined
): Map<string, string> {
  const map = new Map<string, string>();
  if (!applicationData) return map;

  for (const value of Object.values(applicationData)) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const { title, completionCriteria } = item as {
        title?: unknown;
        completionCriteria?: unknown;
      };
      if (typeof title !== "string" || typeof completionCriteria !== "string") continue;
      const trimmed = completionCriteria.trim();
      if (trimmed && !map.has(title)) map.set(title, trimmed);
    }
  }
  return map;
}

// Strip the optional chainId suffix from program IDs (e.g. "959_42161" -> "959").
function parseProgramId(programId: string): string {
  if (programId.includes("_")) {
    const [id] = programId.split("_");
    return id ?? programId;
  }
  return programId;
}

/** Small icon component for filter pills */
function StatusIcon({ icon, className }: { icon: StatusIconName | null; className?: string }) {
  if (!icon) return null;
  const cls = cn("w-3.5 h-3.5", className);
  switch (icon) {
    case "check":
      return <CheckCircleIcon className={cls} />;
    case "clock":
      return <ClockIcon className={cls} />;
    case "arrow-path":
      return <ArrowPathIcon className={cls} />;
    case "circle":
      return (
        <span className="inline-flex items-center justify-center w-3.5 h-3.5">
          <span className="w-2.5 h-2.5 rounded-full border-[1.5px] border-current" />
        </span>
      );
    default:
      return null;
  }
}

// Reviewers care about three buckets at a glance: done, in-progress, not yet started.
// Pending Verification and Pending Completion are collapsed into a single "Pending"
// segment to keep the bar legible and match the filter chip vocabulary.
type ProgressBucket = "verified" | "pending" | "not_started";

const PROGRESS_BUCKET_CONFIG: Record<
  ProgressBucket,
  { label: string; barColor: string; legendColor: string }
> = {
  verified: { label: "Verified", barColor: "bg-green-500", legendColor: "bg-green-500" },
  pending: { label: "Pending", barColor: "bg-yellow-500", legendColor: "bg-yellow-500" },
  not_started: {
    label: "Not Started",
    barColor: "bg-gray-300 dark:bg-gray-600",
    legendColor: "bg-gray-300 dark:bg-gray-600",
  },
};

const PROGRESS_BUCKET_ORDER: ProgressBucket[] = ["verified", "pending", "not_started"];

function statusToBucket(status: MilestoneReviewStatus): ProgressBucket {
  if (status === MilestoneReviewStatus.Verified) return "verified";
  if (status === MilestoneReviewStatus.NotStarted) return "not_started";
  return "pending";
}

/** Single segmented progress bar: green/yellow/gray fill proportional to bucket counts. */
function MilestoneProgressStepper({ milestones }: { milestones: GrantMilestoneWithCompletion[] }) {
  const { total, counts } = useMemo(() => {
    const counts: Record<ProgressBucket, number> = { verified: 0, pending: 0, not_started: 0 };
    for (const m of milestones) counts[statusToBucket(getMilestoneStatus(m))]++;
    return { total: milestones.length, counts };
  }, [milestones]);

  if (total === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 mb-1.5 flex-wrap text-xs text-gray-600 dark:text-gray-400">
        {PROGRESS_BUCKET_ORDER.map((bucket) => {
          const count = counts[bucket];
          if (count === 0) return null;
          const config = PROGRESS_BUCKET_CONFIG[bucket];
          return (
            <span key={bucket} className="flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", config.legendColor)} />
              <span>
                {count} {config.label}
              </span>
            </span>
          );
        })}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={counts.verified}
        aria-label={`Milestone progress: ${counts.verified} of ${total} verified`}
        className="flex h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700"
      >
        {PROGRESS_BUCKET_ORDER.map((bucket) => {
          const count = counts[bucket];
          if (count === 0) return null;
          const config = PROGRESS_BUCKET_CONFIG[bucket];
          const pct = (count / total) * 100;
          return (
            <div
              key={bucket}
              className={cn("h-full transition-all", config.barColor)}
              style={{ width: `${pct}%` }}
              title={`${count} ${config.label}`}
            />
          );
        })}
      </div>
    </div>
  );
}

interface MilestonesReviewPageProps {
  communityId: string;
  projectId: string;
  programId: string;
  referrer?: string;
}

function ProjectAskButton({
  projectUid,
  projectTitle,
  projectSlug,
}: {
  projectUid: string;
  projectTitle: string;
  projectSlug?: string;
}) {
  const setOpen = useAgentChatStore((s) => s.setOpen);
  const addMention = useAgentChatStore((s) => s.addMention);

  const handleClick = useCallback(() => {
    setOpen(true);
    addMention({
      id: `project-${projectUid}`,
      kind: "project",
      label: projectTitle,
      primaryId: projectSlug ?? projectUid,
    });
  }, [setOpen, addMention, projectUid, projectTitle, projectSlug]);

  return (
    <Button
      variant="secondary"
      onClick={handleClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 bg-transparent hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300"
      aria-label={`Ask about project ${projectTitle} in the assistant chat`}
    >
      <AtSymbolIcon className="w-4 h-4" />
      Mention to AI
    </Button>
  );
}

type ReviewPanelTab = "details" | "comments";

function getPlainTextPreview(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMilestoneUidFromHash(): string | null {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash;
  if (!hash.startsWith("#milestone-")) return null;

  const rawMilestoneUid = hash.slice("#milestone-".length);
  if (!rawMilestoneUid) return null;

  try {
    return decodeURIComponent(rawMilestoneUid);
  } catch {
    return rawMilestoneUid;
  }
}

interface MilestoneListItemProps {
  milestone: GrantMilestoneWithCompletion;
  index: number;
  isSelected: boolean;
  onSelect: (milestoneUid: string) => void;
}

const MilestoneListItem = memo(function MilestoneListItem({
  milestone,
  index,
  isSelected,
  onSelect,
}: MilestoneListItemProps) {
  const status = getMilestoneStatus(milestone);
  const statusConfig = MILESTONE_STATUS_CONFIG[status];
  const preview = getPlainTextPreview(milestone.description);

  return (
    <button
      type="button"
      onClick={() => onSelect(milestone.uid)}
      className={cn(
        "group w-full rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
        isSelected
          ? "border-brand-blue bg-blue-50/70 dark:bg-blue-950/20"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/70"
      )}
      aria-pressed={isSelected}
      aria-label={`View milestone ${milestone.title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Milestone {index + 1}
          </p>
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-gray-950 dark:text-white">
            {milestone.title}
          </h3>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-semibold",
            statusConfig.badgeColor
          )}
        >
          {statusConfig.label}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-600 dark:text-gray-400">
        {preview || "No description provided."}
      </p>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Due {formatDate(milestone.dueDate, "UTC")}
      </p>
    </button>
  );
});

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

interface InlineEvaluationCardProps {
  evaluation: MilestoneEvaluationItem;
}

const InlineEvaluationCard = memo(function InlineEvaluationCard({
  evaluation,
}: InlineEvaluationCardProps) {
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

export function MilestonesReviewPage({
  communityId,
  projectId,
  programId,
  referrer,
}: MilestonesReviewPageProps) {
  // Supports both "959" and legacy "959_42161" formats
  const parsedProgramId = useMemo(() => parseProgramId(programId), [programId]);

  // Wrap with PermissionProvider that includes programId for proper reviewer role detection
  return (
    <PermissionProvider
      resourceContext={{
        communityId,
        programId: parsedProgramId,
      }}
    >
      <MilestonesReviewPageContent
        communityId={communityId}
        projectId={projectId}
        programId={programId}
        parsedProgramId={parsedProgramId}
        referrer={referrer}
      />
    </PermissionProvider>
  );
}

function MilestonesReviewPageContent({
  communityId,
  projectId,
  programId,
  parsedProgramId,
  referrer,
}: MilestonesReviewPageProps & { parsedProgramId: string }) {
  const { data, isLoading, error, refetch } = useProjectGrantMilestones(projectId, programId);
  const [verifyingMilestoneId, setVerifyingMilestoneId] = useState<string | null>(null);
  const [verificationComment, setVerificationComment] = useState("");
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MilestoneFilterKey | null>(null);
  const [selectedMilestoneUid, setSelectedMilestoneUid] = useState<string | null>(null);
  const [activePanelTab, setActivePanelTab] = useState<ReviewPanelTab>("details");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const { address } = useAccount();
  const { hasAccess: hasAdminAccess, isLoading: isLoadingAdminAccess } =
    useCommunityAdminAccess(communityId);

  // Check if user is a reviewer for this program using RBAC
  const isReviewer = useIsReviewer();
  const isMilestoneReviewer = useIsReviewerType(ReviewerType.MILESTONE);
  const { isLoading: isLoadingReviewer } = usePermissionContext();

  // Determine if user can verify milestones (must be before early returns)
  // Only milestone reviewers, admins, contract owners, and staff can verify/complete/sync
  const canVerifyMilestones = useMemo(
    () => hasAdminAccess || isMilestoneReviewer || false,
    [hasAdminAccess, isMilestoneReviewer]
  );

  // Determine if user can delete milestones
  // Contract owners, community admins, staff, and milestone reviewers can delete milestones
  const canDeleteMilestones = useMemo(
    () => hasAdminAccess || isMilestoneReviewer || false,
    [hasAdminAccess, isMilestoneReviewer]
  );

  // Delete milestone hook with proper React Query mutation/query relationship
  const { deleteMilestoneAsync, isDeleting } = useDeleteMilestone({
    projectId,
    programId,
    onSuccess: async () => {
      await refetch();
    },
  });

  // Get the actual project UID from the data (projectId might be a slug)
  const projectUID = data?.project?.uid;

  // Fetch funding application data by project UID (must be before any returns)
  const {
    application: fundingApplication,
    isLoading: isLoadingFundingApp,
    error: fundingApplicationError,
    refetch: refetchFundingApplication,
  } = useFundingApplicationByProjectUID(projectUID || "");

  // On-chain milestone attestations don't carry completion criteria, so we look
  // it up from the application data (where the grantee originally entered it).
  const completionCriteriaByTitle = useMemo(
    () => extractCompletionCriteriaByTitle(fundingApplication?.applicationData),
    [fundingApplication?.applicationData]
  );

  // Memoize reference number: prefer funding application, fallback to milestone completion data
  const referenceNumber = useMemo(() => {
    if (fundingApplication?.referenceNumber) {
      return fundingApplication.referenceNumber;
    }
    // Fallback: extract from any milestone that has funding application completion data
    const milestones = data?.grantMilestones ?? [];
    for (const m of milestones) {
      if (m.fundingApplicationCompletion?.referenceNumber) {
        return m.fundingApplicationCompletion.referenceNumber;
      }
    }
    return undefined;
  }, [fundingApplication?.referenceNumber, data?.grantMilestones]);

  // Get grant name from first milestone's programId (must be before any returns)
  const grantName = useMemo(() => {
    const milestoneProgramId = data?.grantMilestones[0]?.programId;
    if (milestoneProgramId) {
      return `Program ${parseProgramId(milestoneProgramId)}`;
    }
    return `Program ${parsedProgramId}`;
  }, [data?.grantMilestones, parsedProgramId]);

  // Memoized back button configuration
  const backButtonConfig = useMemo(() => {
    // Only show back to application if came from application page
    if (referrer === "application" && referenceNumber) {
      const appUrl = hasAdminAccess
        ? PAGES.ADMIN.FUNDING_PLATFORM_APPLICATIONS(communityId, programId) + `/${referenceNumber}`
        : isReviewer
          ? PAGES.REVIEWER.APPLICATION_DETAIL(communityId, parsedProgramId, referenceNumber)
          : null;

      if (appUrl) {
        return { url: appUrl, label: "Back to Application" };
      }
    }

    // Default: back to milestones report
    return {
      url: PAGES.ADMIN.MILESTONES(communityId),
      label: "Back to Milestones Report",
    };
  }, [
    referrer,
    referenceNumber,
    hasAdminAccess,
    isReviewer,
    communityId,
    programId,
    parsedProgramId,
  ]);

  // Memoized milestone review URL - only returns URL if application is approved
  const milestoneReviewUrl = useMemo(() => {
    if (fundingApplication?.status?.toLowerCase() === "approved" && referenceNumber) {
      const appUrl = hasAdminAccess
        ? PAGES.ADMIN.FUNDING_PLATFORM_APPLICATIONS(communityId, programId) + `/${referenceNumber}`
        : isReviewer
          ? PAGES.REVIEWER.APPLICATION_DETAIL(communityId, parsedProgramId, referenceNumber)
          : null;

      return appUrl;
    }
    return null;
  }, [
    fundingApplication?.status,
    referenceNumber,
    hasAdminAccess,
    isReviewer,
    communityId,
    programId,
    parsedProgramId,
  ]);

  const { verifyMilestone, isVerifying } = useMilestoneCompletionVerification({
    projectId,
    programId,
    onSuccess: async () => {
      await refetch();
      setVerifyingMilestoneId(null);
      setVerificationComment("");
    },
  });

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
      // Pass isMilestoneReviewer flag instead of generic isReviewer
      await verifyMilestone(milestone, isMilestoneReviewer || false, data, verificationComment);
    },
    [data, verifyMilestone, isMilestoneReviewer, verificationComment]
  );

  const handleDeleteMilestone = useCallback(
    async (milestone: GrantMilestoneWithCompletion) => {
      const milestoneId = milestone.uid;
      setDeletingMilestoneId(milestoneId);

      try {
        await deleteMilestoneAsync(milestone);
      } finally {
        setDeletingMilestoneId(null);
      }
    },
    [deleteMilestoneAsync]
  );

  const handleRequestChanges = useCallback(() => {
    setActivePanelTab("comments");
  }, []);

  // Fetch milestone allocations for the grant
  const grantUid = data?.grant?.uid;
  const grantUIDsForAllocations = useMemo(() => (grantUid ? [grantUid] : []), [grantUid]);
  const { allocationMap } = useMilestoneAllocationsByGrants(grantUIDsForAllocations);

  const milestones = data?.grantMilestones ?? EMPTY_MILESTONES;
  const selectedMilestone = useMemo(
    () => milestones.find((milestone) => milestone.uid === selectedMilestoneUid) ?? null,
    [milestones, selectedMilestoneUid]
  );

  useEffect(() => {
    const syncSelectedMilestoneFromHash = () => {
      setSelectedMilestoneUid(getMilestoneUidFromHash());
    };

    syncSelectedMilestoneFromHash();
    window.addEventListener("hashchange", syncSelectedMilestoneFromHash);

    return () => {
      window.removeEventListener("hashchange", syncSelectedMilestoneFromHash);
    };
  }, []);

  const handleMilestoneSelect = useCallback(
    (milestoneUid: string) => {
      setSelectedMilestoneUid(milestoneUid);
      setActivePanelTab("details");

      const nextParams = new URLSearchParams(searchParamsString);
      nextParams.delete("milestone");
      nextParams.delete("milestoneUid");
      const query = nextParams.toString() ? `?${nextParams.toString()}` : "";
      window.history.replaceState(
        null,
        "",
        `${pathname}${query}#milestone-${encodeURIComponent(milestoneUid)}`
      );
    },
    [pathname, searchParamsString]
  );

  // Default to the full milestone list. Reviewers can narrow the index with status chips.
  const activeFilter = useMemo<MilestoneFilterKey>(() => {
    if (statusFilter !== null) return statusFilter;
    return "all";
  }, [statusFilter]);

  // Single-pass: group milestones by status, derive counts, filter, and sort.
  // Sort: non-verified by due date asc first, verified by due date asc last.
  const { filteredMilestones, counts } = useMemo(() => {
    const statusMap = new Map<GrantMilestoneWithCompletion, MilestoneReviewStatus>();
    const grouped = new Map<MilestoneReviewStatus, GrantMilestoneWithCompletion[]>();
    for (const m of milestones) {
      const s = getMilestoneStatus(m);
      statusMap.set(m, s);
      let group = grouped.get(s);
      if (!group) {
        group = [];
        grouped.set(s, group);
      }
      group.push(m);
    }

    const counts: Record<MilestoneFilterKey, number> = {
      all: milestones.length,
      [MilestoneReviewStatus.Verified]: grouped.get(MilestoneReviewStatus.Verified)?.length ?? 0,
      [MilestoneReviewStatus.PendingVerification]:
        grouped.get(MilestoneReviewStatus.PendingVerification)?.length ?? 0,
      [MilestoneReviewStatus.PendingCompletion]:
        grouped.get(MilestoneReviewStatus.PendingCompletion)?.length ?? 0,
      [MilestoneReviewStatus.NotStarted]:
        grouped.get(MilestoneReviewStatus.NotStarted)?.length ?? 0,
    };

    const filtered = activeFilter === "all" ? milestones : (grouped.get(activeFilter) ?? []);
    const sorted = sortMilestones(filtered, (m) => statusMap.get(m) ?? getMilestoneStatus(m));

    return { filteredMilestones: sorted, counts };
  }, [milestones, activeFilter]);

  // Show loading while checking authorization
  if (isLoading || isLoadingReviewer || isLoadingAdminAccess) {
    return (
      <div className="min-h-screen">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/2"></div>
            <div className="h-64 bg-gray-200 dark:bg-zinc-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Check authorization: user must be logged in AND (community admin OR contract owner OR program reviewer OR staff)
  const isAuthorized = address && (hasAdminAccess || isReviewer);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              <h3 className="text-red-800 dark:text-red-200 font-semibold text-lg">
                Unauthorized Access
              </h3>
            </div>
            <p className="text-red-600 dark:text-red-400 mb-4">
              {!address
                ? "You must be logged in to access this page."
                : "You do not have permission to access this page. Only community administrators, contract owners, staff, and program reviewers can review milestones."}
            </p>
            <Link href={PAGES.ADMIN.MILESTONES(communityId)}>
              <Button className="flex flex-row items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white">
                <ChevronLeftIcon className="h-5 w-5" />
                Back to Milestones Report
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">
              Error Loading Milestones
            </h3>
            <p className="text-red-600 dark:text-red-400">
              {error?.message || "Failed to load milestone data"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { project, grant } = data;

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Header Section */}
      <div className="bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          {/* Back button row */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <Link href={backButtonConfig.url}>
              <Button variant="secondary" className="flex items-center text-sm">
                <ArrowLeftIcon className="w-4 h-4 mr-1.5" />
                {backButtonConfig.label}
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <ProjectAskButton
                projectUid={project.uid}
                projectTitle={project.details.title}
                projectSlug={project.details?.slug}
              />
              {milestoneReviewUrl && (
                <Link href={milestoneReviewUrl}>
                  <Button
                    variant="secondary"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 bg-transparent hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300"
                  >
                    View Application
                  </Button>
                </Link>
              )}
            </div>
          </div>
          {/* Title */}
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {grantName} • Milestone Review
            </p>
            <h1 className="text-xl font-bold text-black dark:text-white">
              {project.details.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
            <section className="rounded-lg bg-gray-50/80 p-5 dark:bg-zinc-900">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-950 dark:text-white">
                    Milestones
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {milestones.length} {milestones.length === 1 ? "milestone" : "milestones"} in
                    this grant
                  </p>
                </div>
              </div>

              {milestones.length > 0 && <MilestoneProgressStepper milestones={milestones} />}

              {milestones.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {FILTER_TABS.map((tab) => {
                    const isActive = activeFilter === tab.key;
                    return (
                      <Badge
                        key={tab.key}
                        variant="outline"
                        role="button"
                        tabIndex={0}
                        aria-pressed={isActive}
                        onClick={() => setStatusFilter(tab.key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setStatusFilter(tab.key);
                          }
                        }}
                        className={cn(
                          "cursor-pointer select-none gap-1.5 rounded-full border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted",
                          isActive &&
                            "border-brand-blue bg-brand-blue text-white hover:bg-brand-blue/90"
                        )}
                      >
                        <StatusIcon icon={tab.icon} />
                        {tab.label}
                        <span
                          className={cn(
                            "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[0.65rem] font-semibold",
                            isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {counts[tab.key]}
                        </span>
                      </Badge>
                    );
                  })}
                </div>
              )}

              <div className="max-h-[calc(100vh-18rem)] space-y-3 overflow-y-auto pr-1">
                {filteredMilestones.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center dark:border-zinc-700">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      No milestones found
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {milestones.length === 0
                        ? "This project does not have any milestones yet."
                        : "No milestones match the selected filter."}
                    </p>
                  </div>
                ) : (
                  filteredMilestones.map((milestone) => (
                    <MilestoneListItem
                      key={milestone.uid}
                      milestone={milestone}
                      index={milestones.findIndex((item) => item.uid === milestone.uid)}
                      isSelected={selectedMilestoneUid === milestone.uid}
                      onSelect={handleMilestoneSelect}
                    />
                  ))
                )}
              </div>
            </section>
          </aside>

          <section className="min-w-0">
            <div className="px-1 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Review Workspace
                  </p>
                  {!selectedMilestone && (
                    <h2 className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">
                      Select a milestone
                    </h2>
                  )}
                </div>
                <div className="inline-flex w-max rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
                  {[
                    { key: "details" as const, label: "Details", icon: DocumentTextIcon },
                    { key: "comments" as const, label: "Comments", icon: ChatBubbleLeftRightIcon },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activePanelTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActivePanelTab(tab.key)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
                          isActive
                            ? "bg-white text-gray-950 shadow-sm dark:bg-zinc-950 dark:text-white"
                            : "text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              {activePanelTab === "details" ? (
                selectedMilestone ? (
                  <div className="space-y-4">
                    <MilestoneCard
                      key={selectedMilestone.uid}
                      milestone={selectedMilestone}
                      index={milestones.findIndex((m) => m.uid === selectedMilestone.uid)}
                      verifyingMilestoneId={verifyingMilestoneId}
                      verificationComment={verificationComment}
                      isVerifying={isVerifying}
                      canVerifyMilestones={canVerifyMilestones}
                      canDeleteMilestones={canDeleteMilestones}
                      canEditMilestones={canVerifyMilestones}
                      grantUID={grant?.uid}
                      grantChainID={grant?.chainID}
                      projectUid={project.uid}
                      projectSlug={project.details?.slug}
                      projectTitle={project.details.title}
                      programId={parsedProgramId}
                      onVerifyClick={handleVerifyClick}
                      onCancelVerification={handleCancelVerification}
                      onVerificationCommentChange={setVerificationComment}
                      onSubmitVerification={handleSubmitVerification}
                      onRequestChanges={handleRequestChanges}
                      onDeleteMilestone={handleDeleteMilestone}
                      isDeleting={isDeleting && deletingMilestoneId === selectedMilestone.uid}
                      allocationAmount={
                        allocationMap.get(selectedMilestone.uid) ??
                        allocationMap.get(selectedMilestone.uid.toLowerCase())
                      }
                      showAIEvaluationButton={false}
                      quietSurface
                      completionCriteria={completionCriteriaByTitle.get(selectedMilestone.title)}
                    />
                    <InlineAIEvaluation milestone={selectedMilestone} />
                  </div>
                ) : (
                  <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/60">
                    <DocumentTextIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                    <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
                      Choose a milestone to review
                    </h3>
                    <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                      Pick one from the list to see the full story, review the completion, and leave
                      a note for the team.
                    </p>
                  </div>
                )
              ) : isLoadingFundingApp && !referenceNumber ? (
                <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <div className="h-5 w-40 animate-pulse rounded bg-gray-200 dark:bg-zinc-700" />
                  <div className="space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-zinc-800" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-zinc-800" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-zinc-800" />
                  </div>
                </div>
              ) : fundingApplicationError && !referenceNumber ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
                  <p className="mb-3 text-sm text-red-700 dark:text-red-300">
                    Failed to load linked application data.
                  </p>
                  <Button variant="secondary" onClick={() => refetchFundingApplication()}>
                    Retry
                  </Button>
                </div>
              ) : referenceNumber ? (
                <CommentsAndActivity
                  referenceNumber={referenceNumber}
                  statusHistory={(fundingApplication?.statusHistory || []).map((item) => ({
                    status: item.status,
                    timestamp:
                      typeof item.timestamp === "string"
                        ? item.timestamp
                        : item.timestamp.toISOString(),
                    reason: item.reason,
                  }))}
                  communityId={communityId}
                  currentUserAddress={address}
                  programId={parsedProgramId}
                  embedded
                />
              ) : projectUID ? (
                <GrantCommentsAndActivity
                  projectUID={projectUID}
                  programId={parsedProgramId}
                  communityId={communityId}
                  currentUserAddress={address}
                  referenceNumber={referenceNumber}
                  embedded
                />
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center dark:border-zinc-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Comments are not available until the project data finishes loading.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
