"use client";

import { ArrowLeftIcon, ChevronLeftIcon, ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/Utilities/Button";
import { Badge } from "@/components/ui/badge";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useDeleteMilestone } from "@/hooks/useDeleteMilestone";
import { useFundingApplicationByProjectUID } from "@/hooks/useFundingApplicationByProjectUID";
import { useMilestoneCompletionVerification } from "@/hooks/useMilestoneCompletionVerification";
import { useProjectGrantMilestones } from "@/hooks/useProjectGrantMilestones";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import {
  PermissionProvider,
  useIsReviewer,
  useIsReviewerType,
  usePermissionContext,
} from "@/src/core/rbac/context/permission-context";
import { ReviewerType } from "@/src/core/rbac/types";
import { useOwnerStore } from "@/store";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { CommentsAndActivity } from "./CommentsAndActivity";
import { GrantCompleteButtonForReviewer } from "./GrantCompleteButtonForReviewer";
import { MilestoneCard } from "./MilestoneCard";
import { FILTER_TABS, getMilestoneStatusKey, type MilestoneFilterStatus } from "./milestoneStatus";

interface MilestonesReviewPageProps {
  communityId: string;
  projectId: string;
  programId: string;
  referrer?: string;
}

export function MilestonesReviewPage({
  communityId,
  projectId,
  programId,
  referrer,
}: MilestonesReviewPageProps) {
  // Extract programId from URL param (supports both "959" and legacy "959_42161" formats)
  const { parsedProgramId } = useMemo(() => {
    if (programId.includes("_")) {
      const [id] = programId.split("_");
      return { parsedProgramId: id };
    }
    return { parsedProgramId: programId };
  }, [programId]);

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
        referrer={referrer}
      />
    </PermissionProvider>
  );
}

function MilestonesReviewPageContent({
  communityId,
  projectId,
  programId,
  referrer,
}: MilestonesReviewPageProps) {
  const { data, isLoading, error, refetch } = useProjectGrantMilestones(projectId, programId);
  const [verifyingMilestoneId, setVerifyingMilestoneId] = useState<string | null>(null);
  const [verificationComment, setVerificationComment] = useState("");
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MilestoneFilterStatus>("pending_verification");
  const userSelectedFilter = useRef(false);

  const { address } = useAccount();
  const {
    hasAccess: hasAdminAccess,
    isLoading: isLoadingAdminAccess,
    checks,
  } = useCommunityAdminAccess(communityId);

  // Extract programId from URL param (supports both "959" and legacy "959_42161" formats)
  const { parsedProgramId, parsedChainId } = useMemo(() => {
    // Check if the programId contains chainId suffix (legacy format)
    if (programId.includes("_")) {
      const [id, chain] = programId.split("_");
      return {
        parsedProgramId: id,
        parsedChainId: chain ? parseInt(chain, 10) : undefined,
      };
    }
    // New format: programId only
    return {
      parsedProgramId: programId,
      parsedChainId: undefined,
    };
  }, [programId]);

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
  const { application: fundingApplication } = useFundingApplicationByProjectUID(projectUID || "");

  // Memoize reference number from the funding application
  const referenceNumber = useMemo(
    () => fundingApplication?.referenceNumber,
    [fundingApplication?.referenceNumber]
  );

  // Get grant name from first milestone's programId (must be before any returns)
  const grantName = useMemo(() => {
    const milestoneProgramId = data?.grantMilestones[0]?.programId;
    if (milestoneProgramId) {
      // Normalize programId (strip chainId if present)
      const normalizedId = milestoneProgramId.includes("_")
        ? milestoneProgramId.split("_")[0]
        : milestoneProgramId;
      return `Program ${normalizedId}`;
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

  const allMilestones = data?.grantMilestones ?? [];

  const { filteredMilestones, counts } = useMemo(() => {
    const counts: Record<MilestoneFilterStatus, number> = {
      all: allMilestones.length,
      verified: 0,
      pending_verification: 0,
      pending_completion: 0,
      not_started: 0,
    };
    for (const m of allMilestones) {
      counts[getMilestoneStatusKey(m)]++;
    }
    const filtered =
      statusFilter === "all"
        ? allMilestones
        : allMilestones.filter((m) => getMilestoneStatusKey(m) === statusFilter);
    return { filteredMilestones: filtered, counts };
  }, [allMilestones, statusFilter]);

  // Fall back to "all" if no pending verification milestones on initial load
  useEffect(() => {
    if (
      !userSelectedFilter.current &&
      statusFilter === "pending_verification" &&
      counts.pending_verification === 0 &&
      allMilestones.length > 0
    ) {
      setStatusFilter("all");
    }
  }, [counts.pending_verification, statusFilter, allMilestones.length]);

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

  const { project, grantMilestones, grant } = data;

  // Project data for GrantCompleteButtonForReviewer (only needs uid)
  const projectForButton = {
    uid: project.uid,
  };

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 max-sm:gap-1 max-sm:flex-col max-sm:items-start">
            <Link href={backButtonConfig.url}>
              <Button variant="secondary" className="flex items-center">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                {backButtonConfig.label}
              </Button>
            </Link>
            <div className="flex flex-col gap-1 flex-1">
              <h1 className="text-2xl font-bold text-black dark:text-white">
                {project.details.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {grantName} - Review project milestones
              </p>
            </div>
            {/* Grant Complete Button for Milestone Reviewers */}
            {grant && canVerifyMilestones && (
              <div className="max-sm:w-full">
                <GrantCompleteButtonForReviewer
                  project={projectForButton}
                  grant={grant}
                  onComplete={() => {
                    // Refetch data to update the grant completion status
                    refetch();
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Application Link - Only shown if application is approved */}
        {milestoneReviewUrl && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Application Details
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  View the full application and review details
                </p>
              </div>
              <Link href={milestoneReviewUrl}>
                <Button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white">
                  View Application
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 ">
          {/* Main Content - Milestones */}
          <div className="lg:col-span-2 flex flex-col gap-6 ">
            <section className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
                Project Milestones
              </h2>

              {/* Status filter tabs */}
              {grantMilestones.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {FILTER_TABS.map((tab) => {
                    const isActive = statusFilter === tab.key;
                    return (
                      <Badge
                        key={tab.key}
                        variant="outline"
                        role="button"
                        tabIndex={0}
                        aria-pressed={isActive}
                        onClick={() => {
                          userSelectedFilter.current = true;
                          setStatusFilter(tab.key);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            userSelectedFilter.current = true;
                            setStatusFilter(tab.key);
                          }
                        }}
                        className={cn(
                          "cursor-pointer rounded-full border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors select-none gap-1.5",
                          isActive &&
                            "bg-brand-blue text-white border-brand-blue hover:bg-brand-blue/90"
                        )}
                      >
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
                      {grantMilestones.length === 0
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
                      onVerifyClick={handleVerifyClick}
                      onCancelVerification={handleCancelVerification}
                      onVerificationCommentChange={setVerificationComment}
                      onSubmitVerification={handleSubmitVerification}
                      onDeleteMilestone={handleDeleteMilestone}
                      isDeleting={isDeleting && deletingMilestoneId === milestone.uid}
                    />
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Sidebar - Comments & Activity */}
          {referenceNumber && (
            <div className="lg:col-span-2">
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
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
