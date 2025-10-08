"use client";

import { Button } from "@/components/Utilities/Button";
import { PAGES } from "@/utilities/pages";
import { ChevronLeftIcon, ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useState, useMemo } from "react";
import type { MappedGrantMilestone } from "@/services/milestones";
import { updateMilestoneVerification } from "@/services/milestones";
import { useProjectGrantMilestones } from "@/hooks/useProjectGrantMilestones";
import { useMilestoneCompletionVerification } from "@/hooks/useMilestoneCompletionVerification";
import { useFundingApplicationByProjectUID } from "@/hooks/useFundingApplicationByProjectUID";
import toast from "react-hot-toast";
import { CommentsAndActivity } from "./CommentsAndActivity";
import { MilestoneCard } from "./MilestoneCard";
import { useAccount } from "wagmi";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { useOwnerStore } from "@/store";

interface MilestonesReviewPageProps {
  communityId: string;
  projectId: string;
  programId: string;
}

export function MilestonesReviewPage({
  communityId,
  projectId,
  programId,
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

  const handleVerifyClick = (completionId: string) => {
    setVerifyingMilestoneId(completionId);
    setVerificationComment("");
  };

  const handleCancelVerification = () => {
    setVerifyingMilestoneId(null);
    setVerificationComment("");
  };

  const handleSubmitVerification = async (milestone: MappedGrantMilestone) => {
    if (!data) return;
    await verifyMilestone(milestone, data, verificationComment);
  };

  const handleSyncVerification = async (milestone: MappedGrantMilestone) => {
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
  };

  // Show loading while checking authorization
  if (isLoading || isLoadingCommunityAdmin || isOwnerLoading) {
    return (
      <div className="container mx-auto mt-4 flex gap-8 flex-col w-full px-4 pb-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 dark:bg-zinc-700 rounded"></div>
        </div>
      </div>
    );
  }

  // Check authorization: user must be logged in AND (community admin OR contract owner)
  // Project owners alone do NOT have access unless they are also community admin or contract owner
  const isAuthorized = address && (isCommunityAdmin || isContractOwner);

  if (!isAuthorized) {
    return (
      <div className="container mx-auto mt-4 flex gap-8 flex-col w-full px-4 pb-8">
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
              : "You do not have permission to access this page. Only community administrators and contract owners can review milestones."}
          </p>
          <Link href={PAGES.ADMIN.MILESTONES(communityId)}>
            <Button className="flex flex-row items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white">
              <ChevronLeftIcon className="h-5 w-5" />
              Back to Milestones Report
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto mt-4 flex gap-8 flex-col w-full px-4 pb-8">
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">
            Error Loading Milestones
          </h3>
          <p className="text-red-600 dark:text-red-400">
            {error?.message || "Failed to load milestone data"}
          </p>
        </div>
      </div>
    );
  }

  const { project, grantMilestones } = data;

  return (
    <div className="container mx-auto mt-4 flex gap-8 flex-col w-full px-4 pb-8">
      {/* Header with Back Button */}
      <div className="w-full flex flex-row items-center justify-between">
        <Link href={PAGES.ADMIN.MILESTONES(communityId)}>
          <Button className="flex flex-row items-center gap-2 px-4 py-2 bg-transparent text-black dark:text-white dark:bg-transparent hover:bg-transparent rounded-md transition-all ease-in-out duration-200">
            <ChevronLeftIcon className="h-5 w-5" />
            Back to Milestones Report
          </Button>
        </Link>
      </div>

      {/* Page Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-black dark:text-white">
          {project.details.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {grantName}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Review project milestones from both on-chain and off-chain sources
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Milestones */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <section className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-sm">
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
          <div className="lg:col-span-1">
            <CommentsAndActivity
              referenceNumber={referenceNumber}
              statusHistory={(fundingApplication?.statusHistory || []).map(item => ({
                status: item.status,
                timestamp: typeof item.timestamp === 'string' ? item.timestamp : item.timestamp.toISOString(),
                reason: item.reason
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
