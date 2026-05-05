"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  AtSymbolIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/20/solid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { OutputsAndOutcomes } from "@/components/Pages/Project/Impact/OutputsAndOutcomes";
import { Button } from "@/components/Utilities/Button";
import { Badge } from "@/components/ui/badge";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useMilestoneAllocationsByGrants } from "@/hooks/useCommunityMilestoneAllocations";
import { useDeleteMilestone } from "@/hooks/useDeleteMilestone";
import { useFundingApplicationByProjectUID } from "@/hooks/useFundingApplicationByProjectUID";
import { useMilestoneCompletionVerification } from "@/hooks/useMilestoneCompletionVerification";
import { useProjectGrantMilestones } from "@/hooks/useProjectGrantMilestones";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import { Link } from "@/src/components/navigation/Link";
import {
  PermissionProvider,
  useIsReviewer,
  useIsReviewerType,
  usePermissionContext,
} from "@/src/core/rbac/context/permission-context";
import { ReviewerType } from "@/src/core/rbac/types";
import { useAgentChatStore } from "@/store/agentChat";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { CommentsAndActivity } from "./CommentsAndActivity";
import { GrantCommentsAndActivity } from "./GrantCommentsAndActivity";
import { MilestoneCard } from "./MilestoneCard";
import {
  FILTER_TABS,
  getMilestoneStatus,
  type MilestoneFilterKey,
  MilestoneReviewStatus,
  type StatusIconName,
  sortMilestones,
} from "./utils/milestone-review-status";

const EMPTY_MILESTONES: GrantMilestoneWithCompletion[] = [];

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

  // Memoize reference number: prefer funding application, fallback to milestone completion data
  const referenceNumber = useMemo(() => {
    if (fundingApplication?.referenceNumber) {
      return fundingApplication.referenceNumber;
    }
    // Note: referenceNumber now comes from fundingApplication only
    // (milestones are identified via on-chain UID, not off-chain reference)
    return undefined;
  }, [fundingApplication?.referenceNumber]);

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

  // Fetch milestone allocations for the grant
  const grantUid = data?.grant?.uid;
  const grantUIDsForAllocations = useMemo(() => (grantUid ? [grantUid] : []), [grantUid]);
  const { allocationMap } = useMilestoneAllocationsByGrants(grantUIDsForAllocations);

  const milestones = data?.grantMilestones ?? EMPTY_MILESTONES;

  // When the URL points at a specific milestone (e.g. #milestone-<uid> from
  // an email/Telegram deep-link), the targeted card must always render —
  // otherwise the default PendingVerification filter could hide a verified
  // or in-progress milestone the reviewer was sent to.
  const targetedMilestoneUid = useMemo(() => {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash;
    return hash.startsWith("#milestone-") ? hash.slice("#milestone-".length) : null;
  }, []);

  // Compute the effective filter: default to PendingVerification if any exist, else "all".
  // Once the user explicitly picks a tab, their choice is locked in.
  // If the URL targets a specific milestone, force "all" so it's always visible.
  const activeFilter = useMemo<MilestoneFilterKey>(() => {
    if (statusFilter !== null) return statusFilter;
    if (targetedMilestoneUid) return "all";
    const hasPending = milestones.some(
      (m) => getMilestoneStatus(m) === MilestoneReviewStatus.PendingVerification
    );
    return hasPending ? MilestoneReviewStatus.PendingVerification : "all";
  }, [statusFilter, milestones, targetedMilestoneUid]);

  // Scroll the targeted milestone into view once it has rendered. We can't rely
  // on the browser's native hash-jump because milestones load asynchronously
  // and the card doesn't exist on the initial paint. Runs once after the
  // matching milestone enters the DOM.
  useEffect(() => {
    if (!targetedMilestoneUid || milestones.length === 0) return;
    const exists = milestones.some((m) => m.uid === targetedMilestoneUid);
    if (!exists) return;
    const el = document.getElementById(`milestone-${targetedMilestoneUid}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [targetedMilestoneUid, milestones]);

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
      [MilestoneReviewStatus.Submitted]: grouped.get(MilestoneReviewStatus.Submitted)?.length ?? 0,
      [MilestoneReviewStatus.Approved]: grouped.get(MilestoneReviewStatus.Approved)?.length ?? 0,
      [MilestoneReviewStatus.Rejected]: grouped.get(MilestoneReviewStatus.Rejected)?.length ?? 0,
      [MilestoneReviewStatus.Pending]: grouped.get(MilestoneReviewStatus.Pending)?.length ?? 0,
      [MilestoneReviewStatus.Late]: grouped.get(MilestoneReviewStatus.Late)?.length ?? 0,
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
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Project Impact Metrics — collapsed by default. Reviewers see a
            one-line summary (count + last updated) without losing milestones
            below the fold; expanding shows the same charts/tables as /impact. */}
        <div className="mb-6">
          <OutputsAndOutcomes projectUid={project.uid} columns={2} collapsible />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Content - Milestones */}
          <div className="flex flex-col gap-6 min-w-0">
            <section className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
                Project Milestones
              </h2>

              {/* Progress stepper */}
              {milestones.length > 0 && <MilestoneProgressStepper milestones={milestones} />}

              {/* Status filter tabs */}
              {milestones.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
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
                          "cursor-pointer rounded-full border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors select-none gap-1.5",
                          isActive &&
                            "bg-brand-blue text-white border-brand-blue hover:bg-brand-blue/90"
                        )}
                      >
                        <StatusIcon icon={tab.icon} />
                        {tab.label}
                        <span
                          className={cn(
                            "inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-[0.65rem] font-semibold",
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

              <div className="space-y-4">
                {filteredMilestones.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                    <p className="text-lg font-medium">No milestones found</p>
                    <p className="text-sm">
                      {milestones.length === 0
                        ? "This project does not have any milestones yet"
                        : "No milestones match the selected filter"}
                    </p>
                  </div>
                ) : (
                  filteredMilestones.map((milestone, index) => (
                    <MilestoneCard
                      key={milestone.uid || index}
                      milestone={milestone}
                      index={index}
                      verifyingMilestoneId={verifyingMilestoneId}
                      verificationComment={verificationComment}
                      isVerifying={isVerifying}
                      canVerifyMilestones={canVerifyMilestones}
                      canDeleteMilestones={canDeleteMilestones}
                      // Intentionally reuses canVerifyMilestones — edit and verify share the same permission gate
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
                      onDeleteMilestone={handleDeleteMilestone}
                      isDeleting={isDeleting && deletingMilestoneId === milestone.uid}
                      allocationAmount={
                        allocationMap.get(milestone.uid) ??
                        allocationMap.get(milestone.uid.toLowerCase())
                      }
                    />
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Sidebar - Comments & Activity */}
          <div className="min-w-0">
            {isLoadingFundingApp && !referenceNumber ? (
              <div className="space-y-4 p-4 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                <div className="h-5 w-40 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            ) : fundingApplicationError && !referenceNumber ? (
              <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">
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
              />
            ) : projectUID ? (
              <GrantCommentsAndActivity
                projectUID={projectUID}
                programId={parsedProgramId}
                communityId={communityId}
                currentUserAddress={address}
                referenceNumber={referenceNumber}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
