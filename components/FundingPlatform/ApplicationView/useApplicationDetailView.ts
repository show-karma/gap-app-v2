"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { ApplicationStatus } from "@/components/FundingPlatform/ApplicationView/HeaderActions";
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
import {
  Permission,
  useIsFundingPlatformAdmin,
  useIsFundingPlatformReviewer,
} from "@/src/core/rbac";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { useMilestonesAdminRefetch } from "@/src/features/applications/hooks/use-milestones-admin-refetch";
import { useApplicationVersionsStore } from "@/store/applicationVersions";
import type { IFundingApplication } from "@/types/funding-platform";
import { PAGES } from "@/utilities/pages";

// Whitelist used when seeding activeTabId from the `?tab=` query
// param. Keeps unknown values from drifting the polling-gate state
// away from the actually-rendered tab.
const KNOWN_TAB_IDS = ["application", "milestones", "ai-analysis", "comments", "notes"] as const;
type KnownTabId = (typeof KNOWN_TAB_IDS)[number];

export function isKnownTabId(value: string | null): value is KnownTabId {
  return value !== null && (KNOWN_TAB_IDS as readonly string[]).includes(value);
}

interface UseApplicationDetailViewParams {
  applicationId: string;
  programId: string;
  combinedProgramId: string;
  communityId: string;
}

// UI-only check. The backend API MUST enforce these same restrictions to
// prevent unauthorized edits (it should reject edits for approved applications
// regardless of client-side checks).
const isEditableStatus = (app: IFundingApplication) =>
  !["approved"].includes(app.status.toLowerCase());

/**
 * Container hook for `ApplicationDetailView`. Owns all data fetching, status /
 * comment / edit / delete handlers, and derived permission flags so the view
 * component stays purely presentational.
 */
export function useApplicationDetailView({
  applicationId,
  programId,
  combinedProgramId,
  communityId,
}: UseApplicationDetailViewParams) {
  const router = useRouter();

  const isAdmin = useIsFundingPlatformAdmin();
  const isReviewer = useIsFundingPlatformReviewer();
  // Private notes are reviewer/admin-only. Both hooks are `!isLoading && …`, so
  // this is FALSE while permissions resolve — the Notes tab fails closed and
  // never flashes for an applicant (DEV-515 no-glimpse requirement).
  const canViewNotes = isAdmin || isReviewer;
  const { isLoading: isLoadingPermissions, can } = usePermissionContext();

  const searchParams = useSearchParams();
  const shouldOpenEdit = searchParams.get("edit") === "true";
  // ?tab=comments from TG notification deep-link
  const tabParam = searchParams.get("tab");

  const { address: currentUserAddress } = useAuth();

  // View mode state for ApplicationContent
  const [applicationViewMode, setApplicationViewMode] = useState<"details" | "changes">("details");

  // Active-tab id — used to gate the milestones admin refetch hook (don't poll
  // when admin is looking at AI Analysis or Comments). Seeded from `?tab=` so
  // deep-links land on the right active id without waiting for an onChange
  // event, validated against KNOWN_TAB_IDS.
  const [activeTabId, setActiveTabId] = useState<KnownTabId>(() =>
    isKnownTabId(tabParam) ? tabParam : "application"
  );

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditPostApprovalModalOpen, setIsEditPostApprovalModalOpen] = useState(false);

  // Status change inline form state
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | null>(null);

  const {
    application,
    isLoading: isLoadingApplication,
    refetch: refetchApplication,
  } = useApplication(applicationId);

  // Keep the milestones tab fresh on long-lived admin sessions. Active only
  // when viewing the Milestones tab AND the application is approved (the only
  // state in which milestones can exist on this surface).
  const isApprovedApplication = application?.status?.toLowerCase() === "approved";
  useMilestonesAdminRefetch({
    isActive: activeTabId === "milestones" && isApprovedApplication,
    refetch: refetchApplication,
  });

  // Reconcile activeTabId once the application loads: if the seed came from
  // `?tab=milestones` but this application doesn't expose a Milestones tab
  // (non-approved), correct to "application" so the state doesn't lie about
  // what's rendered.
  useEffect(() => {
    if (!application) return;
    if (activeTabId === "milestones" && !isApprovedApplication) {
      setActiveTabId("application");
    }
    // No reconcile needed for a stale ?tab=notes on a non-reviewer: the notes
    // tab simply isn't in `tabs`, so the render's Math.max(0, findIndex(-1))
    // falls back to the Application tab. (No side effect is keyed on "notes".)
  }, [application, activeTabId, isApprovedApplication]);

  const { data: program, config } = useProgramConfig(programId);
  // chainId from program config, needed for V1 components
  const chainId = program?.chainID;

  // KYC status keyed by referenceNumber (the consistent identifier across apps)
  const { status: kycStatus } = useKycStatus(application?.referenceNumber, communityId);
  const { isEnabled: isKycEnabled } = useKycConfig(communityId);

  // The mutation's pending flag drives the inline form's busy state.
  const { updateStatusAsync, isUpdating: isUpdatingStatus } = useApplicationStatus(programId);

  const {
    comments,
    isLoading: isLoadingComments,
    createCommentAsync,
    editCommentAsync,
    deleteCommentAsync,
    refetch: refetchComments,
  } = useApplicationComments(applicationId, true);

  const { deleteApplicationAsync, isDeleting } = useDeleteApplication();

  const handleBackClick = useBackNavigation({
    fallbackRoute: PAGES.MANAGE.FUNDING_PLATFORM.APPLICATIONS(communityId, combinedProgramId),
  });

  const applicationIdentifier = application?.referenceNumber || application?.id || applicationId;
  const { versions, refetch: refetchVersions } = useApplicationVersions(applicationIdentifier);
  const { selectVersion } = useApplicationVersionsStore();

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

  // Show inline form (toggle if the same status is clicked again)
  const handleStatusChangeClick = (status: ApplicationStatus) => {
    setSelectedStatus((current) => (current === status ? null : status));
  };

  const handleStatusChangeConfirm = async (
    reason?: string,
    approvedAmount?: string,
    approvedCurrency?: string
  ) => {
    if (!selectedStatus) return;
    try {
      await handleStatusChange(selectedStatus, reason, approvedAmount, approvedCurrency);
      setSelectedStatus(null);
      if (selectedStatus === "approved") {
        toast.success("Application approved successfully!");
      } else {
        toast.success(`Application status updated to ${selectedStatus}`);
      }
    } catch {
      // SUPPRESSED: the status mutation's onError owns the failure toast; keep the form open to retry.
    }
  };

  const handleStatusChangeCancel = () => {
    if (!isUpdatingStatus) {
      setSelectedStatus(null);
    }
  };

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

  const handleDeleteClick = () => setIsDeleteModalOpen(true);

  const handleDeleteConfirm = async () => {
    if (!application) return;
    try {
      await deleteApplicationAsync(application.referenceNumber);
      // Only close modal and navigate on success
      setIsDeleteModalOpen(false);
      router.push(PAGES.MANAGE.FUNDING_PLATFORM.APPLICATIONS(communityId, combinedProgramId));
    } catch {
      // Error is handled by the hook (toast + Sentry). Keep the modal open so
      // the user can retry or cancel.
    }
  };

  const handleDeleteCancel = () => setIsDeleteModalOpen(false);

  const canEditApplication = !!application && isEditableStatus(application);

  // Auto-open edit modal when ?edit=true is present in URL
  useEffect(() => {
    if (shouldOpenEdit && application && isAdmin && canEditApplication) {
      setIsEditModalOpen(true);
    }
  }, [shouldOpenEdit, application, isAdmin, canEditApplication]);

  const handleEditClick = () => {
    setIsEditModalOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.set("edit", "true");
    window.history.replaceState({}, "", url.toString());
  };

  const handleEditClose = () => {
    setIsEditModalOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState({}, "", url.toString());
  };

  const handleEditSuccess = async () => {
    // Refetch all data in parallel for better performance
    await Promise.all([refetchApplication(), refetchVersions(), refetchComments()]);
  };

  const handleEditPostApprovalClick = () => setIsEditPostApprovalModalOpen(true);
  const handleEditPostApprovalClose = () => setIsEditPostApprovalModalOpen(false);
  const handleEditPostApprovalSuccess = async () => {
    await refetchApplication();
  };

  const handleVersionClick = (versionId: string) => {
    selectVersion(versionId, versions);
    // Switch to Changes view to show the selected version
    setApplicationViewMode("changes");
    // Scroll to the Application Details section (delay lets the view mode change)
    setTimeout(() => {
      document.getElementById("application-details")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  // Milestone review URL — only when approved and a projectUID exists
  const milestoneReviewUrl = useMemo(() => {
    if (application?.status?.toLowerCase() === "approved" && application?.projectUID) {
      return `${PAGES.MANAGE.FUNDING_PLATFORM.MILESTONES(communityId, combinedProgramId, application.projectUID)}?from=application`;
    }
    return null;
  }, [application?.status, application?.projectUID, communityId, combinedProgramId]);

  // Status actions require at least one status-changing permission and a
  // non-finalized application.
  const showStatusActions =
    !!application &&
    !["approved", "rejected"].includes(application.status.toLowerCase()) &&
    (can(Permission.APPLICATION_CHANGE_STATUS) ||
      can(Permission.APPLICATION_APPROVE) ||
      can(Permission.APPLICATION_REJECT) ||
      can(Permission.APPLICATION_REVIEW));

  // Post-approval edit (admin only): approved AND (program has a post-approval
  // form schema OR data already exists).
  const hasPostApprovalSchema = !!config?.postApprovalFormSchema?.fields?.length;
  const hasPostApprovalData =
    !!application?.postApprovalData && Object.keys(application.postApprovalData).length > 0;
  const canEditPostApproval =
    isAdmin &&
    application?.status?.toLowerCase() === "approved" &&
    (hasPostApprovalSchema || hasPostApprovalData);

  return {
    // Data
    application,
    program,
    config,
    chainId,
    comments,
    versions,
    kycStatus,
    isKycEnabled,
    currentUserAddress,
    // Loading
    isLoading: isLoadingPermissions || isLoadingApplication,
    isLoadingComments,
    // Permissions / derived flags
    isAdmin,
    canViewNotes,
    canEditApplication,
    canEditPostApproval,
    showStatusActions,
    isApprovedApplication,
    milestoneReviewUrl,
    // Tab + view state
    applicationViewMode,
    setApplicationViewMode,
    activeTabId,
    setActiveTabId,
    // Status form
    selectedStatus,
    isUpdatingStatus,
    handleStatusChangeClick,
    handleStatusChangeConfirm,
    handleStatusChangeCancel,
    // Comments
    handleCommentAdd,
    handleCommentEdit,
    handleCommentDelete,
    handleVersionClick,
    // Modals
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
    // Navigation
    handleBackClick,
    refetchApplication,
  };
}
