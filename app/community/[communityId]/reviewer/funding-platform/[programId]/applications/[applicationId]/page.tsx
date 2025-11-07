"use client";

import { ArrowLeftIcon, EyeIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import ApplicationContent from "@/components/FundingPlatform/ApplicationView/ApplicationContent";
import CommentsSection from "@/components/FundingPlatform/ApplicationView/CommentsSection";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  useApplication,
  useApplicationComments,
  useApplicationStatus,
  useApplicationVersions,
  useProgramConfig,
} from "@/hooks/useFundingPlatform";
import { usePermissions } from "@/hooks/usePermissions";
import { useApplicationVersionsStore } from "@/store/applicationVersions";
import { PAGES } from "@/utilities/pages";
import { layoutTheme } from "@/src/helper/theme";

/**
 * Reviewer Application Detail Page
 * Allows reviewers to view full application details and add comments
 * Reuses the same components as admin page but with reviewer permissions
 */
export default function ReviewerApplicationDetailPage() {
  const { communityId, programId: combinedProgramId, applicationId } = useParams() as {
    communityId: string;
    programId: string;
    applicationId: string;
  };

  // Extract programId and chainId from the combined format (e.g., "777_11155111")
  const [programId, chainId] = combinedProgramId.split("_");
  const parsedChainId = parseInt(chainId, 10);

  // Check if user is a reviewer for this program
  const { hasPermission: canView, isLoading: isLoadingPermission } = usePermissions({
    programId,
    chainID: parsedChainId,
    action: "read",
  });

  // Get current user address for comments
  const { address: currentUserAddress } = useAccount();

  // View mode state for ApplicationContent
  const [applicationViewMode, setApplicationViewMode] = useState<"details" | "changes">("details");

  // Fetch application data
  const {
    application,
    isLoading: isLoadingApplication,
    refetch: refetchApplication,
  } = useApplication(applicationId);

  // Fetch program config
  const { data: program } = useProgramConfig(programId, parsedChainId);

  // Use the application status hook (reviewers won't use this but needed for component)
  // Using the hook even though reviewers don't change status to avoid breaking component expectations
  useApplicationStatus(programId, parsedChainId);

  // Use the comments hook - reviewers can view and add comments
  const {
    comments,
    isLoading: isLoadingComments,
    createCommentAsync,
    editCommentAsync,
    deleteCommentAsync,
  } = useApplicationComments(applicationId, false); // false = not admin

  // Get application identifier for fetching versions
  const applicationIdentifier = application?.referenceNumber || application?.id || applicationId;

  // Fetch versions using React Query
  const { versions } = useApplicationVersions(applicationIdentifier);

  // Get version selection from store
  const { selectVersion } = useApplicationVersionsStore();

  // Handle status change - reviewers cannot change status
  const handleStatusChange = async (_status: string, _note?: string) => {
    // Reviewers cannot change status
    return Promise.reject(new Error("Reviewers cannot change application status"));
  };

  // Handle comment operations - reviewers can add and edit their own comments
  const handleCommentAdd = async (content: string) => {
    if (!applicationId) return;
    await createCommentAsync({ content });
  };

  const handleCommentEdit = async (commentId: string, content: string) => {
    await editCommentAsync({ commentId, content });
  };

  const handleCommentDelete = async (commentId: string) => {
    await deleteCommentAsync(commentId);
  };

  const handleVersionClick = (versionId: string) => {
    // Select the version to view
    selectVersion(versionId, versions);
    // Switch to Changes view to show the selected version
    setApplicationViewMode("changes");

    // Scroll to the Application Details section
    setTimeout(() => {
      const element = document.getElementById("application-details");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  // Memoized milestone review URL - only returns URL if approved and has projectUID
  const milestoneReviewUrl = useMemo(() => {
    if (application?.status?.toLowerCase() === "approved" && application?.projectUID) {
      return `${PAGES.ADMIN.PROJECT_MILESTONES(communityId, application.projectUID, combinedProgramId)}&from=application`;
    }
    return null;
  }, [application?.status, application?.projectUID, communityId, combinedProgramId]);

  // Check loading states
  if (isLoadingPermission || isLoadingApplication) {
    return (
      <div className="flex w-full items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  // Check access
  if (!canView) {
    return (
      <div className={layoutTheme.padding}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">
            You don&apos;t have permission to view this application.
          </p>
          <Link
            href={PAGES.REVIEWER.APPLICATIONS(communityId, programId, parsedChainId)}
            className="flex gap-2 items-center text-black text-sm font-semibold dark:text-white border border-black dark:border-white rounded-md px-2 py-2"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  // Check if application exists
  if (!application) {
    return (
      <div className="min-h-screen">
        <div className={layoutTheme.padding}>
          <Link
            href={PAGES.REVIEWER.APPLICATIONS(communityId, programId, parsedChainId)}
            className="flex gap-2 items-center text-black text-sm font-semibold dark:text-white border border-black dark:border-white rounded-md px-2 py-2"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Applications
          </Link>
          <p className="text-gray-500">Application not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header with Reviewer Badge */}
      <div className="bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 max-sm:gap-1 max-sm:flex-col max-sm:items-start">
              <Link
                href={PAGES.REVIEWER.APPLICATIONS(communityId, programId, parsedChainId)}
                className="flex gap-2 items-center text-black text-sm font-semibold dark:text-white border border-black dark:border-white rounded-md px-2 py-2"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Applications
              </Link>
              <div className="flex flex-col gap-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Application Details
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Application ID: {application.referenceNumber}
                </p>
              </div>
            </div>

            {/* Reviewer Access Badge */}
            <div className="flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full">
              <EyeIcon className="w-4 h-4 text-blue-700 dark:text-blue-300 mr-2" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Reviewer Access
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout - Same as Admin */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Application Content (Read-only for reviewers) */}
          <div className="space-y-6">
            {/* Milestone Review Link - Only shown if application is approved and has projectUID */}
            {milestoneReviewUrl && (
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                      Review Project Milestones
                    </h3>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      View and verify milestone completions for this approved
                      application
                    </p>
                  </div>
                  <Link href={milestoneReviewUrl}>
                    <Button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white">
                      View Milestones
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <ApplicationContent
              application={application}
              program={program}
              showStatusActions={false} // Reviewers cannot change status
              showAIEvaluationButton={false} // Reviewers cannot run AI evaluation
              onStatusChange={handleStatusChange}
              viewMode={applicationViewMode}
              onViewModeChange={setApplicationViewMode}
              onRefresh={refetchApplication}
            />
          </div>

          {/* Right Column - Comments (Reviewers can add comments) */}
          <div>
            <CommentsSection
              applicationId={application.referenceNumber}
              comments={comments}
              statusHistory={application.statusHistory}
              versionHistory={versions}
              currentStatus={application.status}
              isAdmin={false} // Not admin, but can comment
              currentUserAddress={currentUserAddress}
              onCommentAdd={handleCommentAdd}
              onCommentEdit={handleCommentEdit}
              onCommentDelete={handleCommentDelete}
              onVersionClick={handleVersionClick}
              isLoading={isLoadingComments}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

