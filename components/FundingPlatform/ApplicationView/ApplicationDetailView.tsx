"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
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
import { Button } from "@/components/Utilities/Button";
import { useAuth } from "@/hooks/useAuth";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import {
  useApplication,
  useApplicationComments,
  useApplicationStatus,
  useApplicationVersions,
  useDeleteApplication,
  useProgramConfig,
} from "@/hooks/useFundingPlatform";
import { useKycConfig, useKycStatus } from "@/hooks/useKycStatus";
import { Link } from "@/src/components/navigation/Link";
import { AdminOnly, Permission, useIsFundingPlatformAdmin } from "@/src/core/rbac";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { MilestonesTab } from "@/src/features/applications/components/MilestonesTab";
import { useMilestonesAdminRefetch } from "@/src/features/applications/hooks/use-milestones-admin-refetch";
import { layoutTheme } from "@/src/helper/theme";
import { useApplicationVersionsStore } from "@/store/applicationVersions";
import type { IFundingApplication } from "@/types/funding-platform";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { isFundingProgramConfig } from "@/utilities/type-guards";

// Whitelist used when seeding activeTabId from the `?tab=` query
// param. Keeps unknown values from drifting the polling-gate state
// away from the actually-rendered tab.
const KNOWN_TAB_IDS = ["application", "milestones", "ai-analysis", "comments"] as const;
type KnownTabId = (typeof KNOWN_TAB_IDS)[number];

function isKnownTabId(value: string | null): value is KnownTabId {
  return value !== null && (KNOWN_TAB_IDS as readonly string[]).includes(value);
}

export interface ApplicationDetailViewProps {
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
 * not duplicate this logic.
 */
export default function ApplicationDetailView({
  applicationId,
  programId,
  combinedProgramId,
  communityId,
  variant = "page",
  className,
}: ApplicationDetailViewProps) {
  const router = useRouter();
  const isPanel = variant === "panel";

  const isAdmin = useIsFundingPlatformAdmin();
  const { isLoading: isLoadingPermissions } = usePermissionContext();

  // Check for edit parameter in URL
  const searchParams = useSearchParams();
  const shouldOpenEdit = searchParams.get("edit") === "true";

  // ?tab=comments from TG notification deep-link
  const tabParam = searchParams.get("tab");

  // Get current user address
  const { address: currentUserAddress } = useAuth();

  // View mode state for ApplicationContent
  const [applicationViewMode, setApplicationViewMode] = useState<"details" | "changes">("details");

  // Active-tab id — used to gate the milestones admin refetch hook
  // (don't poll when admin is looking at AI Analysis or Comments).
  // Seeded from `?tab=` so deep-links land on the right active id
  // without waiting for an onChange event. Validated against
  // KNOWN_TAB_IDS to keep unknown deep-link values from drifting the
  // state away from the actually-rendered tab. The post-load
  // reconcile useEffect below also corrects `?tab=milestones` on a
  // non-approved application (where the Milestones tab is filtered
  // out at render time).
  const [activeTabId, setActiveTabId] = useState<KnownTabId>(() =>
    isKnownTabId(tabParam) ? tabParam : "application"
  );

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit post-approval modal state
  const [isEditPostApprovalModalOpen, setIsEditPostApprovalModalOpen] = useState(false);

  // Status change inline form state
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch application data
  const {
    application,
    isLoading: isLoadingApplication,
    refetch: refetchApplication,
  } = useApplication(applicationId);

  // Keep the milestones tab fresh on long-lived admin sessions. Active
  // only when the admin is viewing the Milestones tab AND the
  // application is approved (the only state in which milestones can
  // exist on this surface).
  const isApprovedApplication = application?.status?.toLowerCase() === "approved";
  useMilestonesAdminRefetch({
    isActive: activeTabId === "milestones" && isApprovedApplication,
    refetch: refetchApplication,
  });

  // Reconcile activeTabId once the application loads: if the seed
  // came from `?tab=milestones` but this application doesn't expose a
  // Milestones tab (non-approved), correct to "application" so the
  // state doesn't lie about what's rendered. Only runs when we know
  // the application's approval status (i.e. application is loaded).
  useEffect(() => {
    if (!application) return;
    if (activeTabId === "milestones" && !isApprovedApplication) {
      setActiveTabId("application");
    }
  }, [application, activeTabId, isApprovedApplication]);

  // Reset the inline status form when switching to a different application
  // (panel variant reuses this component across selections).
  useEffect(() => {
    setSelectedStatus(null);
    setApplicationViewMode("details");
  }, [applicationId]);

  // Fetch program config
  const { data: program, config } = useProgramConfig(programId);

  // Get chainId from program config if needed for V1 components
  const chainId = program?.chainID;

  // Fetch KYC status for the application - use referenceNumber as project identifier
  // (referenceNumber is the consistent identifier used across all apps for KYC)
  const { status: kycStatus } = useKycStatus(application?.referenceNumber, communityId);

  // Fetch KYC config to get form URLs
  const { isEnabled: isKycEnabled } = useKycConfig(communityId);

  // Use the application status hook
  const { updateStatusAsync } = useApplicationStatus(programId);

  // Use the comments hook - all users with access can view comments
  const {
    comments,
    isLoading: isLoadingComments,
    createCommentAsync,
    editCommentAsync,
    deleteCommentAsync,
    refetch: refetchComments,
  } = useApplicationComments(applicationId, true);

  // Use the delete application hook
  const { deleteApplicationAsync, isDeleting } = useDeleteApplication();

  const handleBackClick = useBackNavigation({
    fallbackRoute: PAGES.MANAGE.FUNDING_PLATFORM.APPLICATIONS(communityId, combinedProgramId),
  });

  // Get application identifier for fetching versions
  const applicationIdentifier = application?.referenceNumber || application?.id || applicationId;

  // Fetch versions using React Query
  const { versions, refetch: refetchVersions } = useApplicationVersions(applicationIdentifier);

  // Get version selection from store
  const { selectVersion } = useApplicationVersionsStore();

  // Handle status change
  const handleStatusChange = async (
    status: string,
    note?: string,
    approvedAmount?: string,
    approvedCurrency?: string
  ) => {
    if (!application) return;
    await updateStatusAsync({
      applicationId: application.referenceNumber,
      status,
      note,
      approvedAmount,
      approvedCurrency,
    });
  };

  // Handle status change click - shows inline form (toggle if same status clicked)
  const handleStatusChangeClick = (status: ApplicationStatus) => {
    setSelectedStatus((current) => (current === status ? null : status));
  };

  // Handle status change confirmation from inline form
  const handleStatusChangeConfirm = async (
    reason?: string,
    approvedAmount?: string,
    approvedCurrency?: string
  ) => {
    if (!selectedStatus) return;

    setIsUpdatingStatus(true);
    try {
      await handleStatusChange(selectedStatus, reason, approvedAmount, approvedCurrency);
      // Success: hide inline form and clear state
      setSelectedStatus(null);
      if (selectedStatus === "approved") {
        toast.success("Application approved successfully!");
      } else {
        toast.success(`Application status updated to ${selectedStatus}`);
      }
    } catch (error) {
      // Error: keep form open so user can retry
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update application status";
      toast.error(errorMessage);
    } finally {
      // Always clear loading state
      setIsUpdatingStatus(false);
    }
  };

  // Handle inline form cancel
  const handleStatusChangeCancel = () => {
    if (!isUpdatingStatus) {
      setSelectedStatus(null);
    }
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
      router.push(PAGES.MANAGE.FUNDING_PLATFORM.APPLICATIONS(communityId, combinedProgramId));
    } catch {
      // Error is handled by the hook (toast with a specific message + Sentry).
      // Keep the modal open so the user can retry or cancel.
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
  };

  // Helper function to check if editing is allowed
  // NOTE: This is a UI-only check. The backend API MUST enforce these same restrictions
  // to prevent unauthorized edits. The backend should reject edit requests for applications
  // with status 'approved' regardless of client-side checks.
  const canEditApplication = (app: IFundingApplication) => {
    const restrictedStatuses = ["approved"];
    return !restrictedStatuses.includes(app.status.toLowerCase());
  };

  // Auto-open edit modal when ?edit=true is present in URL
  useEffect(() => {
    if (shouldOpenEdit && application && isAdmin && canEditApplication(application)) {
      setIsEditModalOpen(true);
    }
  }, [shouldOpenEdit, application, isAdmin]);

  // Handle edit application
  const handleEditClick = () => {
    setIsEditModalOpen(true);
    // Add edit=true to URL
    const url = new URL(window.location.href);
    url.searchParams.set("edit", "true");
    window.history.replaceState({}, "", url.toString());
  };

  const handleEditClose = () => {
    setIsEditModalOpen(false);
    // Remove edit param from URL
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState({}, "", url.toString());
  };

  const handleEditSuccess = async () => {
    // Refetch all data in parallel for better performance
    await Promise.all([refetchApplication(), refetchVersions(), refetchComments()]);
  };

  // Handle post-approval edit
  const handleEditPostApprovalClick = () => {
    setIsEditPostApprovalModalOpen(true);
  };

  const handleEditPostApprovalClose = () => {
    setIsEditPostApprovalModalOpen(false);
  };

  const handleEditPostApprovalSuccess = async () => {
    await refetchApplication();
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

  // Memoized milestone review URL - only returns URL if approved and has projectUID
  const milestoneReviewUrl = useMemo(() => {
    if (application?.status?.toLowerCase() === "approved" && application?.projectUID) {
      return `${PAGES.MANAGE.FUNDING_PLATFORM.MILESTONES(communityId, combinedProgramId, application.projectUID)}?from=application`;
    }
    return null;
  }, [application?.status, application?.projectUID, communityId, combinedProgramId]);

  // Get can function from permission context for permission-based checks
  const { can } = usePermissionContext();

  // Check if status actions should be shown
  // User needs at least one of the status-changing permissions and the application must not be finalized
  const showStatusActions =
    application &&
    !["approved", "rejected"].includes(application.status.toLowerCase()) &&
    (can(Permission.APPLICATION_CHANGE_STATUS) ||
      can(Permission.APPLICATION_APPROVE) ||
      can(Permission.APPLICATION_REJECT) ||
      can(Permission.APPLICATION_REVIEW));

  // Check if post-approval edit should be enabled (admin only)
  // Show when approved AND (program has a post-approval form schema OR data already exists)
  const hasPostApprovalSchema = !!config?.postApprovalFormSchema?.fields?.length;
  const hasPostApprovalData =
    !!application?.postApprovalData && Object.keys(application.postApprovalData).length > 0;
  const canEditPostApproval =
    isAdmin &&
    application?.status?.toLowerCase() === "approved" &&
    (hasPostApprovalSchema || hasPostApprovalData);

  // Check loading states
  if (isLoadingPermissions || isLoadingApplication) {
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

  // Check if application exists
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

  const detailBody = (
    <>
      {/* Application Header Card with Actions - connects to tabs when no milestone link and no inline form */}
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
              canEdit={isAdmin && canEditApplication(application)}
              onEditPostApprovalClick={handleEditPostApprovalClick}
              canEditPostApproval={canEditPostApproval}
            />
          </AdminOnly>
        }
      />

      {/* Status Change Inline Form - Shows below header when status action is selected (admin only) */}
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
              Review Milestones
            </Link>
          </div>
        </div>
      )}

      {/* Tab-based Layout */}
      {(() => {
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
          // Milestones tab only renders once the application is
          // approved — pre-approval there's no grant on-chain yet
          // and `milestoneStatuses[]` is always empty.
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

        // Derive tab index from the tab id rather than hardcoding —
        // prevents silent breakage when the Milestones tab is or isn't
        // present.
        const tabParamIndex = tabParam ? tabs.findIndex((t) => t.id === tabParam) : -1;
        const defaultIndex = tabParamIndex >= 0 ? tabParamIndex : 0;

        const handleTabChange = (index: number) => {
          const tab = tabs[index];
          if (tab && isKnownTabId(tab.id)) setActiveTabId(tab.id);
        };

        return (
          <ApplicationTabs
            connectedToHeader={!milestoneReviewUrl && !selectedStatus}
            defaultIndex={defaultIndex}
            tabs={tabs}
            onChange={handleTabChange}
          />
        );
      })()}

      {/* Delete Confirmation Modal - Admin only */}
      <DeleteApplicationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        referenceNumber={application.referenceNumber}
        isDeleting={isDeleting}
      />

      {/* Edit Application Modal - Admin only */}
      {application && isAdmin && (
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

      {/* Edit Post-Approval Modal - Admin only */}
      {application && canEditPostApproval && (
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
      {/* Main Content */}
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
