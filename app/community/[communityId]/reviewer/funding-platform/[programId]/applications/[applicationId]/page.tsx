"use client";

import { ArrowLeftIcon, EyeIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { AIAnalysisTab } from "@/components/FundingPlatform/ApplicationView/AIAnalysisTab";
import ApplicationHeader from "@/components/FundingPlatform/ApplicationView/ApplicationHeader";
import { ApplicationTab } from "@/components/FundingPlatform/ApplicationView/ApplicationTab";
import {
  ApplicationTabs,
  type TabConfig,
  TabIcons,
} from "@/components/FundingPlatform/ApplicationView/ApplicationTabs";
import { DiscussionTab } from "@/components/FundingPlatform/ApplicationView/DiscussionTab";
import { TabPanel } from "@/components/FundingPlatform/ApplicationView/TabPanel";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  useApplication,
  useApplicationComments,
  useApplicationVersions,
  useProgramConfig,
} from "@/hooks/useFundingPlatform";
import { usePermissions } from "@/hooks/usePermissions";
import { layoutTheme } from "@/src/helper/theme";
import { useApplicationVersionsStore } from "@/store/applicationVersions";
import { PAGES } from "@/utilities/pages";

/**
 * Reviewer Application Detail Page
 * Allows reviewers to view full application details and add comments
 * Uses the same tab-based layout as admin page but with reviewer permissions
 */
export default function ReviewerApplicationDetailPage() {
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

  // Extract programId from the combined format if present (e.g., "777_11155111" -> "777")
  const programId = combinedProgramId.includes("_")
    ? combinedProgramId.split("_")[0]
    : combinedProgramId;

  // Check if user is a reviewer for this program
  const { hasPermission: canView, isLoading: isLoadingPermission } = usePermissions({
    programId,
    action: "read",
  });

  // Get current user address for comments
  const { address: currentUserAddress } = useAccount();

  // View mode state for ApplicationTab
  const [applicationViewMode, setApplicationViewMode] = useState<"details" | "changes">("details");

  // Fetch application data
  const {
    application,
    isLoading: isLoadingApplication,
    refetch: refetchApplication,
  } = useApplication(applicationId);

  // Fetch program config
  const { data: program } = useProgramConfig(programId);

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

  const handleBackClick = () => {
    router.push(PAGES.REVIEWER.APPLICATIONS(communityId, programId));
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
          <Button onClick={handleBackClick} variant="secondary" className="flex items-center mt-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Applications
          </Button>
        </div>
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
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Button with Reviewer Badge */}
        <div className="mb-4 flex items-center justify-between">
          <Button onClick={handleBackClick} variant="secondary" className="flex items-center">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Applications
          </Button>

          {/* Reviewer Access Badge */}
          <div className="flex items-center px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-full border border-blue-200 dark:border-blue-800">
            <EyeIcon className="w-4 h-4 text-blue-700 dark:text-blue-300 mr-2" aria-hidden="true" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Reviewer Access
            </span>
          </div>
        </div>

        {/* Application Header - No status actions for reviewers */}
        <ApplicationHeader
          application={application}
          program={program}
          connectedToTabs={!milestoneReviewUrl}
        />

        {/* Milestone Review Link - Only shown if application is approved and has projectUID */}
        {milestoneReviewUrl && (
          <div className="my-6 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                  Review Project Milestones
                </h3>
                <p className="text-xs text-green-700 dark:text-green-300">
                  View and verify milestone completions for this approved application
                </p>
              </div>
              <Link
                href={milestoneReviewUrl}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
              >
                View Milestones
              </Link>
            </div>
          </div>
        )}

        {/* Tab-based Layout */}
        <ApplicationTabs
          connectedToHeader={!milestoneReviewUrl}
          tabs={
            [
              {
                id: "application",
                label: "Application",
                icon: TabIcons.Application,
                content: (
                  <TabPanel>
                    <ApplicationTab
                      application={application}
                      program={program}
                      viewMode={applicationViewMode}
                      onViewModeChange={setApplicationViewMode}
                    />
                  </TabPanel>
                ),
              },
              {
                id: "ai-analysis",
                label: "AI Analysis",
                icon: TabIcons.AIAnalysis,
                content: (
                  <TabPanel>
                    <AIAnalysisTab
                      application={application}
                      program={program}
                      onEvaluationComplete={refetchApplication}
                      canRunEvaluation={false} // Reviewers cannot run evaluations
                    />
                  </TabPanel>
                ),
              },
              {
                id: "discussion",
                label: "Discussion",
                icon: TabIcons.Discussion,
                content: (
                  <TabPanel padded={false}>
                    <DiscussionTab
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
                  </TabPanel>
                ),
              },
            ] satisfies TabConfig[]
          }
        />
      </div>
    </div>
  );
}
