"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Edit, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Application, ApplicationStatus, FundingProgram } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

interface ApplicationPageClientProps {
  communityId: string;
  applicationId: string;
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

export function ApplicationPageClient({ communityId, applicationId }: ApplicationPageClientProps) {
  const { address } = useAuth();

  // Fetch application
  const {
    data: application,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["wl-application-detail", communityId, applicationId],
    queryFn: async () => {
      const [res, err] = await fetchData<Application>(
        `/v2/funding-applications/${applicationId}`,
        "GET"
      );
      if (err) throw new Error(err);
      if (!res) throw new Error("Application not found");
      return res;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch program
  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ["wl-program-for-app", application?.programId],
    queryFn: async () => {
      const [res, err] = await fetchData<FundingProgram>(
        `/v2/funding-program-configs/${application!.programId}`,
        "GET"
      );
      if (err) throw new Error(err);
      return res as FundingProgram;
    },
    enabled: !!application?.programId,
    staleTime: 1000 * 60 * 10,
  });

  const isOwner = useMemo(() => {
    if (!address || !application) return false;
    return application.ownerAddress?.toLowerCase() === address.toLowerCase();
  }, [address, application]);

  const canEdit = useMemo(() => {
    if (!application) return false;
    if (!editableStatuses.includes(application.status)) return false;
    if (program?.metadata.endsAt) {
      const isDeadlinePassed = new Date(program.metadata.endsAt) < new Date();
      const isRevision = application.status === "revision_requested";
      if (isDeadlinePassed && !isRevision) return false;
    }
    return true;
  }, [application, program]);

  // Loading
  if (isLoading) {
    return (
      <div className="container px-4 py-8">
        <div className="flex flex-col items-center justify-center rounded-xl border border-border py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Loading application details...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !application) {
    return (
      <div className="container px-4 py-8">
        <div className="flex flex-col items-center rounded-xl border border-border py-12 text-center">
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            {error ? "Error loading application" : "Application not found"}
          </h2>
          <p className="mb-6 text-muted-foreground">
            {error instanceof Error ? error.message : "The application could not be found."}
          </p>
          <div className="flex gap-3">
            {error && (
              <button
                type="button"
                onClick={() => refetch()}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            )}
            <Link
              href={`/community/${communityId}/my-applications`}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Back to My Applications
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-foreground">
              Application for {programLoading ? "..." : programName}
            </h1>
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

      {/* Status History */}
      {application.statusHistory && application.statusHistory.length > 0 && (
        <div className="rounded-xl border border-border">
          <div className="border-b border-border p-4">
            <h2 className="text-lg font-semibold text-foreground">Status History</h2>
          </div>
          <div className="space-y-3 p-4">
            {application.statusHistory.map((entry, index) => (
              <div
                key={`status-${index}`}
                className="flex items-start gap-3 rounded-lg bg-muted/50 p-3"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {formatStatusLabel(entry.status as ApplicationStatus)}
                  </p>
                  {entry.reason && (
                    <p className="mt-1 text-sm text-muted-foreground">{entry.reason}</p>
                  )}
                </div>
                <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(entry.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
