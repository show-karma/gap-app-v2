"use client";

import { ArrowLeftIcon, TrashIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import ApplicationContent from "@/components/FundingPlatform/ApplicationView/ApplicationContent";
import CommentsSection from "@/components/FundingPlatform/ApplicationView/CommentsSection";
import DeleteApplicationModal from "@/components/FundingPlatform/ApplicationView/DeleteApplicationModal";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  useApplication,
  useApplicationComments,
  useApplicationStatus,
  useApplicationVersions,
  useDeleteApplication,
  useProgramConfig,
} from "@/hooks/useFundingPlatform";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { useStaff } from "@/hooks/useStaff";
import { layoutTheme } from "@/src/helper/theme";
import { useOwnerStore } from "@/store";
import { useApplicationVersionsStore } from "@/store/applicationVersions";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";

export default function ApplicationDetailPage() {
  const router = useRouter();
  const {
    communityId,
    programId: combinedProgramId,
    applicationId,
  } = useParams() as {
    communityId: string;
    programId: string;
    applicationId: string;
  };

  // Extract programId and chainId from the combined format (e.g., "777_11155111")
  const [programId, chainId] = combinedProgramId.split("_");
  const parsedChainId = parseInt(chainId, 10);

  const { isCommunityAdmin, isLoading: isLoadingAdmin } = useIsCommunityAdmin(communityId);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isStaff, isLoading: isStaffLoading } = useStaff();
  const hasAccess = isCommunityAdmin || isOwner || isStaff;

  // Get current user address
  const { address: currentUserAddress } = useAccount();

  // View mode state for ApplicationContent
  const [applicationViewMode, setApplicationViewMode] = useState<"details" | "changes">("details");

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch application data
  const {
    application,
    isLoading: isLoadingApplication,
    refetch: refetchApplication,
  } = useApplication(applicationId);

  // Fetch program config
  const { data: program } = useProgramConfig(programId, parsedChainId);

  // Use the application status hook
  const { updateStatusAsync } = useApplicationStatus(programId, parsedChainId);

  // Use the comments hook
  const {
    comments,
    isLoading: isLoadingComments,
    createCommentAsync,
    editCommentAsync,
    deleteCommentAsync,
  } = useApplicationComments(applicationId, hasAccess);

  // Use the delete application hook
  const { deleteApplicationAsync, isDeleting } = useDeleteApplication();

  // Get application identifier for fetching versions
  const applicationIdentifier = application?.referenceNumber || application?.id || applicationId;

  // Fetch versions using React Query
  const { versions } = useApplicationVersions(applicationIdentifier);

  // Get version selection from store
  const { selectVersion } = useApplicationVersionsStore();

  // Handle status change
  const handleStatusChange = async (status: string, note?: string) => {
    if (!application) return;
    await updateStatusAsync({
      applicationId: application.referenceNumber,
      status,
      note,
    });
  };

  // Handle comment operations
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

  // Handle delete application
  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!application) return;

    try {
      await deleteApplicationAsync(application.referenceNumber);
      // Only close modal and navigate on success
      setIsDeleteModalOpen(false);
      router.push(`${PAGES.ADMIN.FUNDING_PLATFORM_APPLICATIONS(communityId, combinedProgramId)}`);
    } catch (error) {
      // Error is handled by the hook (shows toast with specific message and logs to Sentry)
      // Modal stays open to allow user to retry or cancel
      console.error("Failed to delete application:", error);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
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
    }, 100); // Small delay to ensure the view mode has changed
  };

  const handleBackClick = () => {
    router.push(`${PAGES.ADMIN.FUNDING_PLATFORM_APPLICATIONS(communityId, combinedProgramId)}`);
  };

  // Memoized milestone review URL - only returns URL if approved and has projectUID
  const milestoneReviewUrl = useMemo(() => {
    if (application?.status?.toLowerCase() === "approved" && application?.projectUID) {
      return `${PAGES.ADMIN.PROJECT_MILESTONES(communityId, application.projectUID, combinedProgramId)}&from=application`;
    }
    return null;
  }, [application?.status, application?.projectUID, communityId, combinedProgramId]);

  // Check loading states
  if (isLoadingAdmin || isStaffLoading || isLoadingApplication) {
    return (
      <div className="flex w-full items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  // Check access
  if (!hasAccess) {
    return (
      <div className={layoutTheme.padding}>
        <p className="text-red-500">{MESSAGES.REVIEWS.NOT_ADMIN}</p>
      </div>
    );
  }

  // Check if application exists
  if (!application) {
    return (
      <div className="min-h-screen">
        <div className={layoutTheme.padding}>
          <Button onClick={handleBackClick} variant="secondary" className="flex items-center mb-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Applications
          </Button>
          <p className="text-gray-500">Application not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 max-sm:gap-1 max-sm:flex-col max-sm:items-start">
              <Button onClick={handleBackClick} variant="secondary" className="flex items-center">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Applications
              </Button>
              <div className="flex flex-col gap-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Application Details
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Application ID: {application.referenceNumber}
                </p>
              </div>
            </div>
            {/* Delete button - Only show for community admins */}
            {isCommunityAdmin && (
              <Button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
              >
                <TrashIcon className="w-4 h-4" />
                Delete Application
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Application Content and AI Evaluation */}
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
                      View and verify milestone completions for this approved application
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
              showStatusActions={hasAccess}
              showAIEvaluationButton={hasAccess}
              showInternalEvaluation={hasAccess}
              onStatusChange={handleStatusChange}
              viewMode={applicationViewMode}
              onViewModeChange={setApplicationViewMode}
              onRefresh={refetchApplication}
            />
          </div>

          {/* Right Column - Comments */}
          <div className="space-y-6">
            <CommentsSection
              applicationId={application.referenceNumber}
              comments={comments}
              statusHistory={application.statusHistory}
              versionHistory={versions}
              currentStatus={application.status}
              isAdmin={hasAccess}
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

      {/* Delete Confirmation Modal */}
      <DeleteApplicationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        referenceNumber={application.referenceNumber}
        isDeleting={isDeleting}
      />
    </div>
  );
}
