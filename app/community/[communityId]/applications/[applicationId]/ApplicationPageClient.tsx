"use client";

import { ArrowLeft, Calendar, Edit, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { CommentTimeline } from "@/src/features/application-comments/components/CommentTimeline";
import { ApplicationStatusHistory } from "@/src/features/applications/components/ApplicationStatusHistory";
import type { Application, ApplicationStatus, FundingProgram } from "@/types/whitelabel-entities";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

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

export function ApplicationPageClient({
  communityId,
  application,
  program,
}: ApplicationPageClientProps) {
  const { address, authenticated } = useAuth();

  const isOwner = useMemo(() => {
    if (!address || !application) return false;
    return application.ownerAddress?.toLowerCase() === address.toLowerCase();
  }, [address, application]);

  const canEdit = useMemo(() => {
    if (!editableStatuses.includes(application.status)) return false;
    if (program?.metadata.endsAt) {
      const isDeadlinePassed = new Date(program.metadata.endsAt) < new Date();
      const isRevision = application.status === "revision_requested";
      if (isDeadlinePassed && !isRevision) return false;
    }
    return true;
  }, [application, program]);

  const programName =
    program?.name || program?.metadata?.title || `Program ${application.programId}`;
  const displayData = Object.entries(application.applicationData || {});

  return (
    <div className="container flex flex-col gap-6 px-4 py-8">
      {/* Header */}
      <div>
        <Link
          href={
            isOwner
              ? `/community/${communityId}/my-applications`
              : `/community/${communityId}/browse-applications?programId=${application.programId}`
          }
          className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {isOwner ? "Back to My Applications" : "Back to Browse Applications"}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-foreground">Application for {programName}</h1>
            <p className="text-muted-foreground">Reference: {application.referenceNumber}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isOwner && canEdit && (
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

      {/* Application Details */}
      <div className="rounded-xl border border-border">
        <div className="border-b border-border p-4">
          <h2 className="text-xl font-semibold text-foreground">Application Details</h2>
        </div>
        <div className="space-y-6 p-6">
          {displayData.length === 0 ? (
            <p className="text-muted-foreground">No application data available.</p>
          ) : (
            displayData.map(([key, value]) => (
              <div key={key}>
                <p className="mb-1 text-sm text-muted-foreground">
                  {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                </p>
                <div className="text-foreground">
                  {typeof value === "boolean" ? (
                    value ? (
                      "Yes"
                    ) : (
                      "No"
                    )
                  ) : Array.isArray(value) ? (
                    value.some((item) => typeof item === "object" && item !== null) ? (
                      <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-sm">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {value.map((item, index) => (
                          <span
                            key={`${key}-${index}`}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                          >
                            {String(item)}
                          </span>
                        ))}
                      </div>
                    )
                  ) : typeof value === "object" && value !== null ? (
                    <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-sm">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    <p className="whitespace-pre-wrap">{String(value)}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comments & Activity
       * Authenticated users see the full CommentTimeline (comments + status history).
       * Public / unauthenticated users see only the ApplicationStatusHistory.
       * P1-12: conditional timeline based on auth state.
       */}
      {authenticated ? (
        <CommentTimeline
          applicationId={application.referenceNumber}
          statusHistory={application.statusHistory || []}
          currentUserAddress={address || undefined}
          communityId={communityId}
        />
      ) : (
        <ApplicationStatusHistory statusHistory={application.statusHistory || []} />
      )}
    </div>
  );
}
