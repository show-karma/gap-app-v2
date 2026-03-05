"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "@/src/components/navigation/Link";
import type { Application, FundingProgram } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";

interface ApplicationEditClientProps {
  communityId: string;
  application: Application;
}

export function ApplicationEditClient({ communityId, application }: ApplicationEditClientProps) {
  // Fetch program details
  const {
    data: program,
    isLoading: programLoading,
    error: programError,
    refetch,
  } = useQuery({
    queryKey: ["application", "program", application.programId],
    queryFn: async () => {
      const [res, err] = await fetchData<FundingProgram>(
        `/v2/funding-program-configs/${application.programId}`,
        "GET"
      );
      if (err) throw new Error(err);
      return res as FundingProgram;
    },
    staleTime: 1000 * 60 * 10,
  });

  const isDeadlinePassed = program?.metadata.endsAt
    ? new Date(program.metadata.endsAt) < new Date()
    : false;
  const isRevision = application.status === "revision_requested";
  const isDisabled = !program?.applicationConfig?.isEnabled || (isDeadlinePassed && !isRevision);

  // Loading
  if (programLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center justify-center rounded-xl border border-border py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  // Program fetch error (non-blocking — show edit form anyway)
  if (programError) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center rounded-xl border border-border py-12 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-yellow-500" />
          <h2 className="mb-2 text-xl font-semibold text-foreground">Could Not Load Program</h2>
          <p className="mb-6 text-muted-foreground">
            {programError instanceof Error
              ? programError.message
              : "Failed to load program details."}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
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

  const programName = program?.name || program?.metadata?.title || "Program";

  return (
    <div className="flex flex-col gap-5">
      {/* Warning Banner */}
      {isDisabled && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
          <div>
            <p className="font-semibold text-yellow-700 dark:text-yellow-400">
              Application Editing Disabled
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-500">
              {isDeadlinePassed
                ? "The deadline for this program has passed. Applications can no longer be edited."
                : "This program is no longer accepting application updates."}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/community/${communityId}/applications/${application.referenceNumber}`}
          className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Application
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-foreground">
          Edit Application for {programName}
        </h1>
        {application.status === "revision_requested" && (
          <p className="text-muted-foreground">
            Your application requires revisions. Please review the feedback and update accordingly.
          </p>
        )}
      </div>

      {/* Revision Request Banner */}
      {application.status === "revision_requested" && (
        <div className="mb-6 rounded-xl border border-orange-300 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <p className="mb-1 font-semibold text-orange-700 dark:text-orange-400">
            Revision Required
          </p>
          {application.statusHistory?.find((s) => s.status === "revision_requested")?.reason && (
            <div className="space-y-1 text-sm text-orange-600 dark:text-orange-500">
              <p className="font-medium">Reason for revision:</p>
              <p>
                {application.statusHistory.find((s) => s.status === "revision_requested")?.reason}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Application Data Display */}
      <div className="rounded-xl border border-border">
        <div className="border-b border-border p-4">
          <h2 className="text-xl font-semibold text-foreground">Application Form</h2>
        </div>
        <div className="space-y-6 p-6">
          {Object.entries(application.applicationData || {}).map(([key, value]) => (
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
          ))}
          <p className="text-sm text-muted-foreground">
            Full editing capabilities (form editing and resubmission) will be available when the
            application form component is ported.
          </p>
        </div>
      </div>
    </div>
  );
}
