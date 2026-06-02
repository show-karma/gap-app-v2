"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { AIAnalysisTab } from "@/components/FundingPlatform/ApplicationView/AIAnalysisTab";
import ApplicationDetailSkeleton from "@/components/FundingPlatform/ApplicationView/ApplicationDetailSkeleton";
import ApplicationHeader from "@/components/FundingPlatform/ApplicationView/ApplicationHeader";
import { ApplicationTab } from "@/components/FundingPlatform/ApplicationView/ApplicationTab";
import {
  ApplicationTabs,
  type TabConfig,
  TabIcons,
} from "@/components/FundingPlatform/ApplicationView/ApplicationTabs";
import DeleteApplicationModal from "@/components/FundingPlatform/ApplicationView/DeleteApplicationModal";
import { DiscussionTab } from "@/components/FundingPlatform/ApplicationView/DiscussionTab";
import EditApplicationModal from "@/components/FundingPlatform/ApplicationView/EditApplicationModal";
import EditPostApprovalModal from "@/components/FundingPlatform/ApplicationView/EditPostApprovalModal";
import HeaderActions, {
  type ApplicationStatus,
} from "@/components/FundingPlatform/ApplicationView/HeaderActions";
import MoreActionsDropdown from "@/components/FundingPlatform/ApplicationView/MoreActionsDropdown";
import { StatusChangeInline } from "@/components/FundingPlatform/ApplicationView/StatusChangeInline";
import { TabPanel } from "@/components/FundingPlatform/ApplicationView/TabPanel";
import { MilestonesReviewPage } from "@/components/Pages/Admin/MilestonesReview";
import { Button } from "@/components/Utilities/Button";
import { Link } from "@/src/components/navigation/Link";
import { AdminOnly } from "@/src/core/rbac";
import { MilestonesTab } from "@/src/features/applications/components/MilestonesTab";
import { layoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";
import { isFundingProgramConfig } from "@/utilities/type-guards";
import { isKnownTabId, useApplicationDetailView } from "./useApplicationDetailView";

const MILESTONE_CTA_CLASS =
  "flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors";

/**
 * "Review Project Milestones" banner. On the standalone page the CTA navigates
 * to the milestone review route; inside the inbox panel it opens the review
 * inline (via `onReviewInline`) so the reviewer never leaves the page.
 */
function MilestoneReviewBanner({
  isPanel,
  milestoneReviewUrl,
  onReviewInline,
}: {
  isPanel: boolean;
  milestoneReviewUrl: string;
  onReviewInline: () => void;
}) {
  return (
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
        {isPanel ? (
          <button type="button" onClick={onReviewInline} className={MILESTONE_CTA_CLASS}>
            Review Milestones
          </button>
        ) : (
          <Link href={milestoneReviewUrl} className={MILESTONE_CTA_CLASS}>
            Review Milestones
          </Link>
        )}
      </div>
    </div>
  );
}

interface ApplicationDetailViewProps {
  /** Application reference number / id used to fetch the application. */
  applicationId: string;
  /** Normalized program id (chainId suffix stripped). */
  programId: string;
  /** Original program id, possibly in `programId_chainId` form, for building routes. */
  combinedProgramId: string;
  communityId: string;
  /**
   * `page` renders the full standalone route (min-h-screen wrapper, Back button,
   * Reviewer-Mode indicator). `panel` renders only the detail body for embedding
   * inside the applications inbox.
   */
  variant?: "page" | "panel";
  className?: string;
}

/**
 * Shared application-detail view. Rendered both by the standalone route
 * `…/applications/[applicationId]` (variant="page") and inline as the right pane
 * of the "My Applications" inbox (variant="panel"). Single source of truth — do
 * not duplicate this logic. All data/handlers live in `useApplicationDetailView`.
 */
export default function ApplicationDetailView({
  applicationId,
  programId,
  combinedProgramId,
  communityId,
  variant = "page",
  className,
}: ApplicationDetailViewProps) {
  const isPanel = variant === "panel";
  // Panel-only: show the full milestone review inline instead of navigating
  // away, so reviewers stay in the inbox. Resets automatically when a different
  // application is selected (the inbox keys this component by reference).
  const [showMilestonesReview, setShowMilestonesReview] = useState(false);
  const {
    application,
    program,
    config,
    chainId,
    comments,
    versions,
    kycStatus,
    isKycEnabled,
    currentUserAddress,
    isLoading,
    isLoadingComments,
    isAdmin,
    canEditApplication,
    canEditPostApproval,
    showStatusActions,
    isApprovedApplication,
    milestoneReviewUrl,
    applicationViewMode,
    setApplicationViewMode,
    activeTabId,
    setActiveTabId,
    selectedStatus,
    isUpdatingStatus,
    handleStatusChangeClick,
    handleStatusChangeConfirm,
    handleStatusChangeCancel,
    handleCommentAdd,
    handleCommentEdit,
    handleCommentDelete,
    handleVersionClick,
    isDeleteModalOpen,
    isEditModalOpen,
    isEditPostApprovalModalOpen,
    isDeleting,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleEditClick,
    handleEditClose,
    handleEditSuccess,
    handleEditPostApprovalClick,
    handleEditPostApprovalClose,
    handleEditPostApprovalSuccess,
    handleBackClick,
    refetchApplication,
  } = useApplicationDetailView({ applicationId, programId, combinedProgramId, communityId });

  // Loading state
  if (isLoading) {
    if (isPanel) {
      return (
        <div className={cn("min-w-0", className)}>
          <ApplicationDetailSkeleton />
        </div>
      );
    }
    return (
      <div className={cn("min-h-screen bg-gray-50 dark:bg-zinc-900", className)}>
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <ApplicationDetailSkeleton />
        </div>
      </div>
    );
  }

  // Not found
  if (!application) {
    if (isPanel) {
      return (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/60">
          <p className="text-gray-500 dark:text-gray-400">Application not found.</p>
        </div>
      );
    }
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

  // Inbox panel: show the milestone review inline (reuses the standalone review
  // page) so the reviewer never leaves the inbox. `onBack` returns to the detail.
  if (isPanel && showMilestonesReview && application.projectUID) {
    return (
      <div className={cn("min-w-0", className)}>
        <MilestonesReviewPage
          communityId={communityId}
          programId={programId}
          projectId={application.projectUID}
          referrer="application"
          onBack={() => setShowMilestonesReview(false)}
        />
      </div>
    );
  }

  const tabs: TabConfig[] = [
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
    // Milestones tab only renders once the application is approved —
    // pre-approval there's no grant on-chain yet and `milestoneStatuses[]` is
    // always empty.
    ...(isApprovedApplication
      ? [
          {
            id: "milestones",
            label: "Milestones",
            icon: TabIcons.Milestones,
            content: (
              <TabPanel>
                <MilestonesTab application={application} isOwner={false} />
              </TabPanel>
            ),
          } satisfies TabConfig,
        ]
      : []),
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
          />
        </TabPanel>
      ),
    },
    {
      id: "comments",
      label: "Comments",
      icon: TabIcons.Discussion,
      content: (
        <TabPanel>
          <DiscussionTab
            applicationId={application.referenceNumber}
            comments={comments}
            statusHistory={application.statusHistory}
            versionHistory={versions}
            currentStatus={application.status}
            isAdmin={isAdmin}
            currentUserAddress={currentUserAddress}
            onCommentAdd={handleCommentAdd}
            onCommentEdit={handleCommentEdit}
            onCommentDelete={handleCommentDelete}
            onVersionClick={handleVersionClick}
            isLoading={isLoadingComments}
            programId={programId}
            enableMentions
            referenceNumber={application.referenceNumber}
          />
        </TabPanel>
      ),
    },
  ];

  // Seed the rendered tab from the live activeTabId (not the static `?tab=`
  // param) so that when the Milestones tab is inserted/removed on an approval
  // transition, ApplicationTabs re-derives the correct panel instead of drifting
  // to whatever now sits at the old index.
  const selectedIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeTabId)
  );

  const handleTabChange = (index: number) => {
    const tab = tabs[index];
    if (tab && isKnownTabId(tab.id)) setActiveTabId(tab.id);
  };

  const detailBody = (
    <>
      {/* Application Header Card with Actions — connects to tabs when no milestone link and no inline form */}
      <ApplicationHeader
        application={application}
        program={program}
        connectedToTabs={!milestoneReviewUrl && !selectedStatus}
        kycStatus={kycStatus}
        isKycEnabled={isKycEnabled}
        statusActions={
          showStatusActions ? (
            <HeaderActions
              currentStatus={application.status as ApplicationStatus}
              onStatusChange={handleStatusChangeClick}
              isUpdating={isUpdatingStatus}
            />
          ) : undefined
        }
        moreActions={
          <AdminOnly>
            <MoreActionsDropdown
              referenceNumber={application.referenceNumber}
              onDeleteClick={handleDeleteClick}
              canDelete={isAdmin}
              isDeleting={isDeleting}
              onEditClick={handleEditClick}
              canEdit={isAdmin && canEditApplication}
              onEditPostApprovalClick={handleEditPostApprovalClick}
              canEditPostApproval={canEditPostApproval}
            />
          </AdminOnly>
        }
      />

      {/* Status Change Inline Form — below header when a status action is selected (admin only) */}
      {selectedStatus && showStatusActions && (
        <StatusChangeInline
          status={selectedStatus}
          onConfirm={handleStatusChangeConfirm}
          onCancel={handleStatusChangeCancel}
          isSubmitting={isUpdatingStatus}
          isReasonRequired={selectedStatus === "revision_requested"}
          application={application}
          programConfig={isFundingProgramConfig(program) ? program : undefined}
        />
      )}

      {/* Milestone Review banner — only when approved and has projectUID */}
      {milestoneReviewUrl && (
        <MilestoneReviewBanner
          isPanel={isPanel}
          milestoneReviewUrl={milestoneReviewUrl}
          onReviewInline={() => setShowMilestonesReview(true)}
        />
      )}

      <ApplicationTabs
        connectedToHeader={!milestoneReviewUrl && !selectedStatus}
        defaultIndex={selectedIndex}
        tabs={tabs}
        onChange={handleTabChange}
      />

      {/* Delete Confirmation Modal — Admin only */}
      <DeleteApplicationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        referenceNumber={application.referenceNumber}
        isDeleting={isDeleting}
      />

      {/* Edit Application Modal — Admin only */}
      {isAdmin && (
        <EditApplicationModal
          isOpen={isEditModalOpen}
          onClose={handleEditClose}
          application={application}
          programId={programId}
          chainId={chainId}
          formSchema={config?.formSchema}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Edit Post-Approval Modal — Admin only */}
      {canEditPostApproval && (
        <EditPostApprovalModal
          isOpen={isEditPostApprovalModalOpen}
          onClose={handleEditPostApprovalClose}
          application={application}
          programId={programId}
          postApprovalFormSchema={config?.postApprovalFormSchema}
          onSuccess={handleEditPostApprovalSuccess}
        />
      )}
    </>
  );

  // Panel variant: detail body only — the inbox supplies the page chrome.
  if (isPanel) {
    return <div className={cn("min-w-0", className)}>{detailBody}</div>;
  }

  // Page variant: full standalone route layout.
  return (
    <div className={cn("min-h-screen bg-gray-50 dark:bg-zinc-900", className)}>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Button and Role Indicator */}
        <div className="mb-4 flex items-center justify-between">
          <Button onClick={handleBackClick} variant="secondary" className="flex items-center">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Applications
          </Button>

          {!isAdmin && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Reviewer Mode
              </span>
            </div>
          )}
        </div>
        {detailBody}
      </div>
    </div>
  );
}
