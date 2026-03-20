"use client";

import { ArrowLeft, Edit, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { ApplicationDataView } from "@/components/FundingPlatform/ApplicationView/ApplicationTab/ApplicationDataView";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@/src/components/navigation/Link";
import { useIsFundingPlatformAdmin } from "@/src/core/rbac";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { Permission } from "@/src/core/rbac/types/permission";
import { Role } from "@/src/core/rbac/types/role";
import { useApplicationAccess } from "@/src/features/applications/hooks/use-application-access";
import { PublicComments } from "@/src/features/application-comments/components/PublicComments";
import { ApplicationStatusHistory } from "@/src/features/applications/components/ApplicationStatusHistory";
import type { IFundingApplication, ProgramWithFormSchema } from "@/types/funding-platform";
import type { Application, ApplicationStatus, FundingProgram } from "@/types/whitelabel-entities";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import { MilestonesTab } from "./components/MilestonesTab";

interface ApplicationPageClientProps {
  communityId: string;
  application: Application;
  program: FundingProgram | null;
}

function getStatusColor(status: ApplicationStatus): string {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "pending":
    case "resubmitted":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "under_review":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "revision_requested":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function formatStatusLabel(status: ApplicationStatus): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

const editableStatuses: ApplicationStatus[] = [
  "pending",
  "revision_requested",
  "rejected",
  "resubmitted",
];

function isMilestoneArray(
  value: unknown
): value is Array<{ title: string; [key: string]: unknown }> {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === "object" &&
    value[0] !== null &&
    "title" in value[0]
  );
}

export function ApplicationPageClient({
  communityId,
  application,
  program,
}: ApplicationPageClientProps) {
  const { user } = useAuth();
  const isAdmin = useIsFundingPlatformAdmin();
  const { hasRoleOrHigher, isReviewer, can } = usePermissionContext();
  const isAdminOrReviewer = hasRoleOrHigher(Role.MILESTONE_REVIEWER) || isReviewer;

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

  // Check if application has milestone fields
  const hasMilestones = useMemo(
    () => Object.values(application.applicationData).some(isMilestoneArray),
    [application.applicationData]
  );

  // Show tabs when application is approved and has milestones
  const shouldShowTabs = application.status === "approved" && hasMilestones;

  const [activeTab, setActiveTab] = useState<"details" | "milestones">(
    shouldShowTabs ? "milestones" : "details"
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <Link
          href={
            isOwner
              ? `/dashboard`
              : `/community/${communityId}/browse-applications?programId=${application.programId}`
          }
          className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {isOwner ? "Back to Dashboard" : "Back to Browse Applications"}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-foreground">Application for {programName}</h1>
            <p className="text-muted-foreground">Reference: {application.referenceNumber}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {showEditButton && (
              <Link
                href={`/community/${communityId}/applications/${application.referenceNumber}/edit`}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Edit className="h-4 w-4" />
                Edit Application
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Status and Metadata */}
      <div className="rounded-xl border border-border p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Status</p>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
                getStatusColor(application.status)
              )}
            >
              {formatStatusLabel(application.status)}
            </span>
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Application ID</p>
            <p className="font-mono text-foreground">{application.referenceNumber}</p>
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Last submission</p>
            <p className="text-foreground">{formatDate(application.updatedAt)}</p>
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Deadline</p>
            <p className="text-foreground">
              {program?.metadata.endsAt ? formatDate(program.metadata.endsAt) : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Admin/Reviewer Banner */}
      {isAdminOrReviewer && application.status !== "approved" && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Want to approve or reject this application?{" "}
            <Link
              href={`/community/${communityId}/manage/funding-platform/${application.programId}/applications/${application.referenceNumber}`}
              className="inline-flex items-center gap-1 font-medium underline hover:no-underline"
            >
              Go to Admin Panel <ExternalLink className="h-3 w-3" />
            </Link>
          </p>
        </div>
      )}

      {/* Tab Bar — only for approved applications with milestones */}
      {shouldShowTabs && (
        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("details")}
              className={cn(
                "py-2 px-1 border-b-2 font-medium text-sm",
                activeTab === "details"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              Application Details
            </button>
            <button
              onClick={() => setActiveTab("milestones")}
              className={cn(
                "py-2 px-1 border-b-2 font-medium text-sm",
                activeTab === "milestones"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              Milestones
            </button>
          </nav>
        </div>
      )}

      {/* Tab Content */}
      {shouldShowTabs && activeTab === "milestones" ? (
        <MilestonesTab application={application} isOwner={isOwner} />
      ) : (
        <div className="rounded-xl border border-border">
          <div className="border-b border-border p-4">
            <h2 className="text-xl font-semibold text-foreground">Application Details</h2>
          </div>
          <div className="p-6">
            <ApplicationDataView
              application={application as unknown as IFundingApplication}
              program={program as unknown as ProgramWithFormSchema}
              excludeMilestones={shouldShowTabs}
            />
          </div>
        </div>
      )}

      {/* Status History — always visible */}
      <ApplicationStatusHistory statusHistory={application.statusHistory || []} />

      {/* Comments — visible for users with comment permission,
          or for guests when "Show comments on public page" is enabled */}
      {(can(Permission.APPLICATION_COMMENT) ||
        program?.applicationConfig?.formSchema?.settings?.showCommentsOnPublicPage) && (
        <PublicComments
          referenceNumber={application.referenceNumber}
          communityId={communityId}
          programId={application.programId}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
