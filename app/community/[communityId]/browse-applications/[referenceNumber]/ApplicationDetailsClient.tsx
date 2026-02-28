"use client";

import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Lock,
  Mail,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/utilities/tailwind";
import { formatDate } from "@/utilities/formatDate";
import fetchData from "@/utilities/fetchData";
import type {
  Application,
  ApplicationStatus,
  FundingProgram,
} from "@/types/whitelabel-entities";

interface ApplicationDetailsClientProps {
  communityId: string;
  referenceNumber: string;
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

function getProjectTitle(app: Application): string {
  for (const [key, value] of Object.entries(app.applicationData)) {
    const nk = key.toLowerCase().replace(/[\s_-]/g, "");
    if (
      nk.includes("projectname") ||
      nk.includes("projecttitle") ||
      nk.includes("title")
    ) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
  }
  return app.referenceNumber;
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .trim();
}

function isSensitiveField(key: string): boolean {
  const lk = key.toLowerCase();
  return (
    lk.includes("evaluation") ||
    lk.includes("score") ||
    lk.includes("feedback") ||
    lk.includes("internal") ||
    lk.includes("admin")
  );
}

interface PublicApplicationResponse {
  application: Application;
  isPrivate?: boolean;
}

export function ApplicationDetailsClient({
  communityId,
  referenceNumber,
}: ApplicationDetailsClientProps) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["wl-public-application-details", communityId, referenceNumber],
    queryFn: async () => {
      const [res, err, , status] = await fetchData<PublicApplicationResponse>(
        `/v2/applications/community/${communityId}/public/${referenceNumber}`,
        "GET",
        {},
        {},
        {},
        false,
      );
      if (status === 403) {
        return { application: null, isPrivate: true };
      }
      if (err) throw new Error(err);
      return res as PublicApplicationResponse;
    },
    staleTime: 1000 * 60 * 5,
  });

  const application = data?.application ?? null;
  const isPrivate = data?.isPrivate ?? false;

  // Fetch program details
  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ["wl-program-for-detail", application?.programId],
    queryFn: async () => {
      const [res, err] = await fetchData<FundingProgram>(
        `/v2/funding-program-configs/${application!.programId}`,
        "GET",
        {},
        {},
        {},
        false,
      );
      if (err) throw new Error(err);
      return res as FundingProgram;
    },
    enabled: !!application?.programId,
    staleTime: 1000 * 60 * 10,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-center rounded-xl border border-border py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">
            Loading application details...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !isPrivate) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex flex-col items-center rounded-xl border border-border py-12 text-center">
          <AlertCircle className="mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            We could not fetch the application.
          </h2>
          <p className="mb-6 text-muted-foreground">
            We have been notified and are looking into it.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Private application
  if (isPrivate) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex flex-col items-center rounded-xl border border-border py-12 text-center">
          <Lock className="mb-4 h-16 w-16 text-yellow-500" />
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            Private Application
          </h2>
          <p className="mb-6 text-muted-foreground">
            This application is private and cannot be viewed publicly. Only
            authorized users can access this application.
          </p>
          <Link
            href={`/community/${communityId}/browse-applications`}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  // Not found
  if (!application) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex flex-col items-center rounded-xl border border-border py-12 text-center">
          <FileText className="mb-4 h-16 w-16 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            Application Not Found
          </h2>
          <p className="mb-6 text-muted-foreground">
            The application you're looking for could not be found. It may have
            been removed or the reference number might be incorrect.
          </p>
          <Link
            href={`/community/${communityId}/browse-applications`}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  const projectName = getProjectTitle(application);
  const publicFields = Object.entries(application.applicationData || {}).filter(
    ([key]) => !isSensitiveField(key),
  );
  const programName =
    program?.name || program?.metadata?.title || `Program ${application.programId}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Back button */}
      <Link
        href={`/community/${communityId}/browse-applications?programId=${application.programId}`}
        className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Applications
      </Link>

      {/* Header Card */}
      <div className="rounded-xl border border-border p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="mb-2 text-2xl font-bold text-foreground">
              {projectName}
            </h1>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-foreground">
                <Building2 className="h-4 w-4" />
                {programLoading ? (
                  <span className="text-sm text-muted-foreground">
                    Loading program...
                  </span>
                ) : (
                  <span className="font-medium">{programName}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>Reference: {application.referenceNumber}</span>
                <span className="hidden sm:inline">·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Submitted: {formatDate(application.createdAt)}
                </span>
                {application.applicantEmail && (
                  <>
                    <span className="hidden sm:inline">·</span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {application.applicantEmail}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-sm font-medium",
              getStatusColor(application.status),
            )}
          >
            {formatStatusLabel(application.status)}
          </span>
        </div>
      </div>

      {/* Application Details */}
      {publicFields.length > 0 && (
        <div className="rounded-xl border border-border">
          <div className="border-b border-border p-4">
            <h2 className="text-lg font-semibold text-foreground">
              Application Details
            </h2>
          </div>
          <div className="space-y-4 p-4">
            {publicFields.map(([key, value]) => (
              <div key={key}>
                <p className="mb-1 text-sm text-muted-foreground">
                  {formatLabel(key)}
                </p>
                <div className="text-foreground">
                  {typeof value === "boolean" ? (
                    value ? "Yes" : "No"
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
            ))}
          </div>
        </div>
      )}

      {/* Status History */}
      {application.statusHistory && application.statusHistory.length > 0 && (
        <div className="rounded-xl border border-border">
          <div className="border-b border-border p-4">
            <h2 className="text-lg font-semibold text-foreground">
              Status History
            </h2>
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
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entry.reason}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">
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
