"use client";

import { Button } from "@/components/Utilities/Button";
import { PAGES } from "@/utilities/pages";
import { ArrowLeftIcon, ChevronLeftIcon, ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useState, useMemo, useCallback } from "react";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import { updateMilestoneVerification } from "@/services/milestones";
import { useProjectGrantMilestones } from "@/hooks/useProjectGrantMilestones";
import { useMilestoneCompletionVerification } from "@/hooks/useMilestoneCompletionVerification";
import { useFundingApplicationByProjectUID } from "@/hooks/useFundingApplicationByProjectUID";
import toast from "react-hot-toast";
import { CommentsAndActivity } from "./CommentsAndActivity";
import { MilestoneCard } from "./MilestoneCard";
import { useAccount } from "wagmi";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { useIsReviewer, useReviewerPrograms } from "@/hooks/usePermissions";
import { useOwnerStore } from "@/store";

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
  const { data, isLoading, error, refetch } = useProjectGrantMilestones(projectId, programId);
  const [verifyingMilestoneId, setVerifyingMilestoneId] = useState<string | null>(null);
  const [verificationComment, setVerificationComment] = useState("");

  const { address } = useAccount();
  const { isCommunityAdmin, isLoading: isLoadingCommunityAdmin } = useIsCommunityAdmin(
    communityId
  );
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isOwnerLoading = useOwnerStore((state) => state.isOwnerLoading);

  // Extract programId and chainId from combined format (e.g., "959_42161")
  const { parsedProgramId, parsedChainId } = useMemo(() => {
    const [id, chain] = programId.split("_");
    return {
      parsedProgramId: id,
      parsedChainId: chain ? parseInt(chain, 10) : undefined,
    };
  }, [programId]);

  // Check if user is a reviewer for this program
  const { isReviewer, isLoading: isLoadingReviewer } = useIsReviewer(
    parsedProgramId,
    parsedChainId
  );

  // Check if user is a milestone reviewer for this program
  const { programs: reviewerPrograms } = useReviewerPrograms();
  const isMilestoneReviewer = useMemo(() => {
    return reviewerPrograms?.some(
      (program) =>
        program.programId === parsedProgramId &&
        program.chainID === parsedChainId &&
        program.isMilestoneReviewer === true
    );
  }, [reviewerPrograms, parsedProgramId, parsedChainId]);

  // Determine if user can verify milestones (must be before early returns)
  // Only milestone reviewers, admins, and contract owners can verify/complete/sync
  const canVerifyMilestones = useMemo(
    () => isCommunityAdmin || isContractOwner || (isMilestoneReviewer || false),
    [isCommunityAdmin, isContractOwner, isMilestoneReviewer]
  );

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
    return data?.grantMilestones[0]?.programId
      ? `Program ${data.grantMilestones[0].programId.split('_')[0]}`
      : `Program ${programId}`;
  }, [data?.grantMilestones, programId]);

  // Memoized back button configuration
  const backButtonConfig = useMemo(() => {
    // Only show back to application if came from application page
    if (referrer === "application" && referenceNumber) {
      const appUrl = (isCommunityAdmin || isContractOwner)
        ? PAGES.ADMIN.FUNDING_PLATFORM_APPLICATIONS(communityId, programId) + `/${referenceNumber}`
        : isReviewer && parsedChainId
          ? PAGES.REVIEWER.APPLICATION_DETAIL(communityId, parsedProgramId, parsedChainId, referenceNumber)
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
  }, [referrer, referenceNumber, isCommunityAdmin, isContractOwner, isReviewer, communityId, programId, parsedProgramId, parsedChainId]);

  // Memoized milestone review URL - only returns URL if application is approved
  const milestoneReviewUrl = useMemo(() => {
    if (fundingApplication?.status?.toLowerCase() === "approved" && referenceNumber) {
      const appUrl = (isCommunityAdmin || isContractOwner)
        ? PAGES.ADMIN.FUNDING_PLATFORM_APPLICATIONS(communityId, programId) + `/${referenceNumber}`
        : isReviewer && parsedChainId
          ? PAGES.REVIEWER.APPLICATION_DETAIL(communityId, parsedProgramId, parsedChainId, referenceNumber)
          : null;

      return appUrl;
    }
    return null;
  }, [fundingApplication?.status, referenceNumber, isCommunityAdmin, isContractOwner, isReviewer, communityId, programId, parsedProgramId, parsedChainId]);

  const { verifyMilestone, isVerifying } = useMilestoneCompletionVerification({
    projectId,
    programId,
    onSuccess: async () => {
      await refetch();
      setVerifyingMilestoneId(null);
      setVerificationComment("");
    },
  });

  const [isSyncing, setIsSyncing] = useState(false);

  const handleVerifyClick = useCallback((completionId: string) => {
    setVerifyingMilestoneId(completionId);
    setVerificationComment("");
  }, []);

  const handleCancelVerification = useCallback(() => {
    setVerifyingMilestoneId(null);
    setVerificationComment("");
  }, []);

  const handleSubmitVerification = useCallback(async (milestone: GrantMilestoneWithCompletion) => {
    if (!data) return;
    // Pass isMilestoneReviewer flag instead of generic isReviewer
    await verifyMilestone(
      milestone,
      isMilestoneReviewer || false,
      data,
      verificationComment
    );
  }, [data, verifyMilestone, isMilestoneReviewer, verificationComment]);

  const handleSyncVerification = useCallback(async (milestone: GrantMilestoneWithCompletion) => {
    if (!milestone.fundingApplicationCompletion || !milestone.verificationDetails) return;

    setIsSyncing(true);
    try {
      // Extract verification comment from verificationDetails description
      const verificationComment = milestone.verificationDetails.description || "";

      await updateMilestoneVerification(
        milestone.fundingApplicationCompletion.referenceNumber,
        milestone.fundingApplicationCompletion.milestoneFieldLabel,
        milestone.fundingApplicationCompletion.milestoneTitle,
        verificationComment
      );

      toast.success("Verification synced successfully to off-chain database!");
      await refetch();
    } catch (error) {
      console.error("Error syncing verification:", error);
      toast.error("Failed to sync verification to database");
    } finally {
      setIsSyncing(false);
    }
  }, [refetch]);

  // Show loading while checking authorization
  if (isLoading || isLoadingCommunityAdmin || isOwnerLoading || isLoadingReviewer) {
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

  // Check authorization: user must be logged in AND (community admin OR contract owner OR program reviewer)
  const isAuthorized = address && (isCommunityAdmin || isContractOwner || isReviewer);

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
                : "You do not have permission to access this page. Only community administrators, contract owners, and program reviewers can review milestones."}
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

  const { project, grantMilestones } = data;

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 max-sm:gap-1 max-sm:flex-col max-sm:items-start">
            <Link href={backButtonConfig.url}>
              <Button
                variant="secondary"
                className="flex items-center"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                {backButtonConfig.label}
              </Button>
            </Link>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-black dark:text-white">
                {project.details.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {grantName} - Review project milestones
              </p>
            </div>
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
              <div className="space-y-4">
                {grantMilestones.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                    <p className="text-lg font-medium">No milestones found</p>
                    <p className="text-sm">This project does not have any milestones yet</p>
                  </div>
                ) : (
                  grantMilestones.map((milestone, index) => (
                    <MilestoneCard
                      key={milestone.uid || index}
                      milestone={milestone}
                      index={index}
                      verifyingMilestoneId={verifyingMilestoneId}
                      verificationComment={verificationComment}
                      isVerifying={isVerifying}
                      isSyncing={isSyncing}
                      canVerifyMilestones={canVerifyMilestones}
                      onVerifyClick={handleVerifyClick}
                      onCancelVerification={handleCancelVerification}
                      onVerificationCommentChange={setVerificationComment}
                      onSubmitVerification={handleSubmitVerification}
                      onSyncVerification={handleSyncVerification}
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
                statusHistory={(fundingApplication?.statusHistory || []).map(item => ({
                  status: item.status,
                  timestamp: typeof item.timestamp === 'string' ? item.timestamp : item.timestamp.toISOString(),
                  reason: item.reason
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
