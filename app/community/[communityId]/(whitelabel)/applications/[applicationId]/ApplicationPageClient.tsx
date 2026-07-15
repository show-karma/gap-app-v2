"use client";

import { ArrowLeft } from "lucide-react";
import pluralize from "pluralize";
import { useCallback, useMemo } from "react";
import { ApplicationDataView } from "@/components/FundingPlatform/ApplicationView/ApplicationTab/ApplicationDataView";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@/src/components/navigation/Link";
import { useIsFundingPlatformAdmin } from "@/src/core/rbac";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { Permission } from "@/src/core/rbac/types/permission";
import { Role } from "@/src/core/rbac/types/role";
import { CommentTimeline } from "@/src/features/application-comments/components/CommentTimeline";
import { PublicComments } from "@/src/features/application-comments/components/PublicComments";
import { PrivateNotesTab } from "@/src/features/application-notes/components/PrivateNotesTab";
import { MilestonesTab } from "@/src/features/applications/components/MilestonesTab";
import { useApplication } from "@/src/features/applications/hooks/use-application";
import { useApplicationAccess } from "@/src/features/applications/hooks/use-application-access";
import type { IFundingApplication, ProgramWithFormSchema } from "@/types/funding-platform";
import type { Application, ApplicationStatus, FundingProgram } from "@/types/whitelabel-entities";
import { formatDate } from "@/utilities/formatDate";
import { PAGES } from "@/utilities/pages";
import { ApplicationHeader } from "./components/ApplicationHeader";
import { ApplicationSidebar } from "./components/ApplicationSidebar";
import {
  ApplicationTabBar,
  type ApplicationTabKey,
  TAB_ICONS,
  type TabDescriptor,
} from "./components/ApplicationTabBar";
import type { ApplicationViewerRole } from "./components/NextStepCard";
import { PostApprovalTab } from "./components/PostApprovalTab";
import { useUrlTabState } from "./components/use-url-tab-state";

interface ApplicationPageClientProps {
  communityId: string;
  application: Application;
  program: FundingProgram | null;
}

const editableStatuses: ApplicationStatus[] = [
  "pending",
  "revision_requested",
  "rejected",
  "resubmitted",
];

export function ApplicationPageClient({
  communityId,
  application,
  program,
}: ApplicationPageClientProps) {
  const { user, authenticated } = useAuth();
  const isAdmin = useIsFundingPlatformAdmin();
  const {
    hasRoleOrHigher,
    isReviewer,
    can,
    isLoading: isPermissionsLoading,
  } = usePermissionContext();
  const isAdminOrReviewer = hasRoleOrHigher(Role.MILESTONE_REVIEWER) || isReviewer;
  // Private notes are reviewer/admin-only. Gate FAILS CLOSED: false while
  // permissions resolve, so on this public/anonymous page the Notes tab never
  // renders (nor even a frame) for applicants/guests. The backend endpoint is
  // the real wall — it 403s anyone who isn't a program/milestone reviewer,
  // community admin, or staff, and the notes query only fires when this is true.
  const canViewNotes = !isPermissionsLoading && isAdminOrReviewer;

  const [selectedTab, setActiveTab] = useUrlTabState();

  // Use authenticated backend check for ownership
  // (SSR-fetched ownerAddress may be sanitized to "")
  const { isOwner: isBackendOwner } = useApplicationAccess(
    communityId,
    application?.referenceNumber
  );
  const isOwner = useMemo(() => {
    if (!application) return false;
    if (isBackendOwner) return true;
    // Privy userId ownership as safety net (for edge cases)
    if (user?.id && application.userId && user.id === application.userId) {
      return true;
    }
    return false;
  }, [isBackendOwner, user?.id, application]);

  const canOwnerEdit = useMemo(() => {
    if (!editableStatuses.includes(application.status)) return false;
    if (program?.metadata.endsAt) {
      const isDeadlinePassed = new Date(program.metadata.endsAt) < new Date();
      const isRevision = application.status === "revision_requested";
      if (isDeadlinePassed && !isRevision) return false;
    }
    return true;
  }, [application, program]);

  // Admins can edit anytime (except approved), owners follow deadline rules
  const showEditButton =
    (isAdmin && application.status !== "approved") || (isOwner && canOwnerEdit);

  const programName =
    program?.name || program?.metadata?.title || `Program ${application.programId}`;

  // The indexer pre-merges application-source + project-source
  // milestones into `application.milestoneStatuses[]`. Either kind being
  // present warrants a Milestones tab; the tab itself just iterates.
  const milestoneCount = application.milestoneStatuses?.length ?? 0;
  const hasMilestones = milestoneCount > 0;

  // Check if post-approval form is configured
  const hasPostApprovalSchema =
    !!program?.applicationConfig?.postApprovalFormSchema?.fields?.length;
  const hasPostApprovalData =
    !!application.postApprovalData && Object.keys(application.postApprovalData).length > 0;
  const showPostApproval =
    application.status === "approved" && (hasPostApprovalSchema || hasPostApprovalData);

  // Comments surface: authenticated users with permission get the full
  // timeline; guests see public comments only when the form enables them.
  const canUseComments = can(Permission.APPLICATION_COMMENT);
  const showPublicComments =
    !canUseComments && !!program?.applicationConfig?.formSchema?.settings?.showCommentsOnPublicPage;
  const hasCommentsSurface = canUseComments || showPublicComments;

  const viewerRole: ApplicationViewerRole = isOwner
    ? "owner"
    : isAdminOrReviewer
      ? "reviewer"
      : "guest";

  // The whitelabel page is fetched server-side without a Privy token, so the
  // backend serves it anonymously and strips the fields it gates by viewer: the
  // private status-change reasons (rejection/revision messages) AND the
  // applicant identity (ownerAddress / applicantEmail). The backend is the
  // guard. Authenticated viewers re-fetch the full application with their token
  // — one call restores both — and the backend returns those fields only to the
  // applicant, reviewers, and admins. Guests keep the sanitized SSR payload.
  const { application: liveApplication } = useApplication(
    communityId,
    application.referenceNumber,
    { initialData: application, enabled: authenticated }
  );
  const app = liveApplication ?? application;
  const statusHistory = app.statusHistory ?? [];

  // Applicant identity is shown only to the applicant (owner) and
  // reviewers/admins; everyone else gets no Applicant section at all.
  const canViewApplicant = viewerRole !== "guest";

  const editHref = PAGES.COMMUNITY.APPLICATION_EDIT(communityId, application.referenceNumber);
  const reviewHref = PAGES.MANAGE.FUNDING_PLATFORM.APPLICATION_DETAIL(
    communityId,
    application.programId,
    application.referenceNumber
  );
  const backHref = isOwner
    ? PAGES.DASHBOARD
    : `${PAGES.COMMUNITY.BROWSE_APPLICATIONS(communityId)}?programId=${application.programId}`;

  const postApprovalPending =
    isOwner && application.status === "approved" && hasPostApprovalSchema && !hasPostApprovalData;

  const fieldCount = Object.keys(application.applicationData ?? {}).length;

  // Persistent tab bar: Details is always present; Milestones / Post Approval
  // appear only when there's data; Comments appears when the viewer has an
  // activity surface (authenticated timeline or enabled public comments).
  const tabs = useMemo<TabDescriptor[]>(() => {
    const list: TabDescriptor[] = [
      { key: "details", label: "Application Details", Icon: TAB_ICONS.details },
    ];
    if (hasMilestones) {
      list.push({
        key: "milestones",
        label: "Milestones",
        Icon: TAB_ICONS.milestones,
        count: milestoneCount,
      });
    }
    if (showPostApproval) {
      list.push({ key: "post-approval", label: "Post Approval", Icon: TAB_ICONS["post-approval"] });
    }
    if (hasCommentsSurface) {
      list.push({ key: "comments", label: "Comments", Icon: TAB_ICONS.comments });
    }
    // Reviewer/admin-only — never added for applicants/guests (fail-closed).
    if (canViewNotes) {
      list.push({ key: "notes", label: "Notes", Icon: TAB_ICONS.notes });
    }
    return list;
  }, [hasMilestones, milestoneCount, showPostApproval, hasCommentsSurface, canViewNotes]);

  // A lone Details tab isn't worth a switcher — render the card directly.
  const hasTabs = tabs.length > 1;

  // Fall back to Details if the selected tab isn't available for this viewer.
  const activeTab: ApplicationTabKey = tabs.some((t) => t.key === selectedTab)
    ? selectedTab
    : "details";

  const handleViewActivity = useCallback(() => {
    if (hasCommentsSurface) {
      setActiveTab("comments");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [hasCommentsSurface, setActiveTab]);

  const commentsSection = canUseComments ? (
    <CommentTimeline
      applicationId={application.referenceNumber}
      statusHistory={statusHistory}
      communityId={communityId}
    />
  ) : showPublicComments ? (
    <PublicComments
      referenceNumber={application.referenceNumber}
      communityId={communityId}
      programId={application.programId}
      isAdmin={isAdmin}
    />
  ) : null;

  const detailsCard = (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Application details</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {fieldCount > 0 && <>{pluralize("field", fieldCount, true)} · </>}
            last edited {formatDate(application.updatedAt)}
          </p>
        </div>
      </div>
      <div className="px-5 py-4">
        <ApplicationDataView
          application={application as unknown as IFundingApplication}
          program={program as unknown as ProgramWithFormSchema}
          excludeMilestones={hasMilestones}
        />
      </div>
    </section>
  );

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isOwner ? "Back to Dashboard" : "Back to Browse Applications"}
      </Link>

      <ApplicationHeader
        programName={programName}
        status={application.status}
        showEditButton={showEditButton}
        editHref={editHref}
        publicHref={PAGES.COMMUNITY.BROWSE_APPLICATIONS(communityId)}
        canReviewInAdmin={isAdminOrReviewer}
        reviewHref={reviewHref}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* MAIN */}
        <div className="order-2 flex flex-col gap-5 lg:order-1">
          {hasTabs && (
            <ApplicationTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          )}

          {(!hasTabs || activeTab === "details") && detailsCard}
          {hasTabs && activeTab === "milestones" && hasMilestones && (
            <MilestonesTab
              application={application}
              isOwner={isOwner}
              invoiceRequired={
                (program?.metadata as Record<string, unknown>)?.invoiceRequired === true
              }
            />
          )}
          {hasTabs && activeTab === "post-approval" && showPostApproval && (
            <PostApprovalTab
              communityId={communityId}
              application={application}
              program={program}
              isOwner={isOwner}
            />
          )}
          {hasTabs && activeTab === "comments" && commentsSection}
          {hasTabs && activeTab === "notes" && canViewNotes && (
            <PrivateNotesTab
              referenceNumber={application.referenceNumber}
              canViewNotes={canViewNotes}
            />
          )}
        </div>

        {/* SIDEBAR */}
        <div className="order-1 lg:order-2">
          <ApplicationSidebar
            application={app}
            program={program}
            programName={programName}
            communityId={communityId}
            viewerRole={viewerRole}
            canViewApplicant={canViewApplicant}
            hasMilestones={hasMilestones}
            postApprovalPending={postApprovalPending}
            editHref={editHref}
            reviewHref={reviewHref}
            statusHistory={statusHistory}
            onGoToMilestones={() => setActiveTab("milestones")}
            onGoToPostApproval={() => setActiveTab("post-approval")}
            onViewActivity={hasCommentsSurface ? handleViewActivity : undefined}
          />
        </div>
      </div>
    </div>
  );
}
