"use client";

import { Button } from "@/components/Utilities/Button";
import { PAGES } from "@/utilities/pages";
import { ChevronLeftIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { MappedGrantMilestone } from "@/services/milestones";
import { updateMilestoneVerification } from "@/services/milestones";
import { useProjectGrantMilestones } from "@/hooks/useProjectGrantMilestones";
import { useMilestoneCompletionVerification } from "@/hooks/useMilestoneCompletionVerification";
import toast from "react-hot-toast";
import { CommentsAndActivity } from "./CommentsAndActivity";
import { useAccount } from "wagmi";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { getProjectMemberRoles } from "@/utilities/getProjectMemberRoles";
import { Project } from "@show-karma/karma-gap-sdk/core/class/entities/Project";
import { getGapClient } from "@/hooks/useGap";

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
  const [isProjectOwnerOrAdmin, setIsProjectOwnerOrAdmin] = useState(false);
  const [isCheckingProjectRole, setIsCheckingProjectRole] = useState(true);

  // Check if user is project owner/admin
  useEffect(() => {
    async function checkProjectRole() {
      if (!address || !data?.project) {
        setIsCheckingProjectRole(false);
        return;
      }

      try {
        const gapClient = getGapClient(data.project.chainID);
        const fetchedProject = await gapClient.fetch.projectById(data.project.uid);
        if (!fetchedProject) {
          setIsProjectOwnerOrAdmin(false);
          setIsCheckingProjectRole(false);
          return;
        }

        // Convert ProjectData to IProjectResponse format for getProjectMemberRoles
        const projectResponse = {
          ...data.project,
          data: data.project.details,
          members: fetchedProject.members || [],
        };

        // Get roles for all members
        const roles = await getProjectMemberRoles(
          projectResponse as any,
          fetchedProject as Project
        );

        // Check if current user is Owner or Admin
        const userRole = roles[address.toLowerCase()];
        setIsProjectOwnerOrAdmin(userRole === "Owner" || userRole === "Admin");
      } catch (err) {
        console.error("Error checking project role:", err);
        setIsProjectOwnerOrAdmin(false);
      } finally {
        setIsCheckingProjectRole(false);
      }
    }

    checkProjectRole();
  }, [address, data]);

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
  if (isLoading || isLoadingCommunityAdmin || isCheckingProjectRole) {
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

  // Check authorization: user must be logged in AND (community admin OR project owner/admin)
  const isAuthorized = address && (isCommunityAdmin || isProjectOwnerOrAdmin);

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
              : "You do not have permission to access this page. Only community administrators and project owners/admins can review milestones."}
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

  // Get reference number from first milestone with fundingApplicationCompletion
  const referenceNumber = grantMilestones.find(
    (m) => m.fundingApplicationCompletion?.referenceNumber
  )?.fundingApplicationCompletion?.referenceNumber;

  // Get grant name from first milestone's programId
  const grantName = grantMilestones[0]?.programId
    ? `Program ${grantMilestones[0].programId.split('_')[0]}`
    : `Program ${programId}`;

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
                grantMilestones.map((milestone, index) => {
                  // Use completionDetails if it has description, otherwise use fundingApplicationCompletion
                  const useOnChainData = milestone.completionDetails?.description;
                  const completionData = useOnChainData
                    ? milestone.completionDetails
                    : milestone.fundingApplicationCompletion;

                  const hasCompletion = completionData !== null;
                  // Use verificationDetails as source of truth for verification status
                  const isVerified = milestone.verificationDetails !== null;
                  const hasOnChainCompletion = milestone.completionDetails !== null;
                  const hasFundingAppCompletion = milestone.fundingApplicationCompletion !== null;

                  // Determine status based on completion data
                  let status = "Not Started";
                  let statusColor = "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";

                  if (isVerified) {
                    status = "Verified";
                    statusColor = "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
                  } else if (hasOnChainCompletion) {
                    status = "Pending Verification";
                    statusColor = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
                  } else if (hasFundingAppCompletion) {
                    status = "Pending Completion and Verification";
                    statusColor = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
                  }

                  return (
                    <div
                      key={milestone.uid || index}
                      className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-medium text-black dark:text-white">
                          {milestone.title}
                        </h3>
                      </div>

                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                        {milestone.description}
                      </p>

                      {hasCompletion && (
                        <>
                          {/* Completion Details Box - Read Only */}
                          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md">
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                              Completion Details {useOnChainData ? "(On-chain)" : "(Off-chain)"}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {useOnChainData
                                ? milestone.completionDetails!.description
                                : milestone.fundingApplicationCompletion!.completionText}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              Submitted: {new Date(
                                useOnChainData
                                  ? milestone.completionDetails!.completedAt
                                  : milestone.fundingApplicationCompletion!.createdAt
                              ).toLocaleDateString()}
                            </p>
                          </div>

                          {/* Verification Section */}
                          {isVerified && milestone.verificationDetails ? (
                            /* Show Verification Box if already verified (from on-chain data) */
                            <div className="mb-3">
                              <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md">
                                <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">
                                  Verification (On-chain)
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {milestone.verificationDetails.description}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  Verified by: {milestone.verificationDetails.verifiedBy.slice(0, 6)}...{milestone.verificationDetails.verifiedBy.slice(-4)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Verified: {new Date(milestone.verificationDetails.verifiedAt).toLocaleDateString()}
                                </p>
                              </div>
                              {/* Show sync button if off-chain data is not synced */}
                              {milestone.fundingApplicationCompletion && !milestone.fundingApplicationCompletion.isVerified && (
                                <div className="mt-2">
                                  <Button
                                    onClick={() => handleSyncVerification(milestone)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700"
                                    disabled={isSyncing}
                                    isLoading={isSyncing}
                                  >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Sync Verification to Off-chain
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Show Verify Button for all non-verified milestones with completion (on-chain or off-chain) */
                            hasCompletion && !isVerified && (
                              <div className="mb-3">
                                {verifyingMilestoneId === milestone.uid ? (
                                  /* Verification Form */
                                  <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md space-y-2">
                                    <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">
                                      Verify Milestone Completion
                                    </p>
                                    <textarea
                                      value={verificationComment}
                                      onChange={(e) => setVerificationComment(e.target.value)}
                                      placeholder="Add verification comment (optional)..."
                                      rows={3}
                                      className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => handleSubmitVerification(milestone)}
                                        className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700"
                                        disabled={isVerifying}
                                        isLoading={isVerifying}
                                      >
                                        Verify
                                      </Button>
                                      <Button
                                        onClick={handleCancelVerification}
                                        className="px-3 py-1 text-xs bg-gray-500 hover:bg-gray-600"
                                        disabled={isVerifying}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Verify Button */
                                  <Button
                                    onClick={() => handleVerifyClick(milestone.uid)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Verify Milestone
                                  </Button>
                                )}
                              </div>
                            )
                          )}
                        </>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-medium">Due:</span>{" "}
                          {new Date(milestone.dueDate).toLocaleDateString()}
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColor}`}>
                          {status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Sidebar - Comments & Activity */}
        {referenceNumber && (
          <div className="lg:col-span-1">
            <CommentsAndActivity
              referenceNumber={referenceNumber}
              statusHistory={[]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
