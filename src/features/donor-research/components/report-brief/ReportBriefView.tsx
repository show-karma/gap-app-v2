"use client";

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useDonorAdvisor } from "@/hooks/useDonorAdvisor";
import { useDonorReportStream } from "@/hooks/useDonorReportStream";
import { useDonorReport } from "@/hooks/useDonorReports";
import { permissionsKeys } from "@/src/core/rbac/hooks/use-permissions";
import { useStaff } from "@/src/core/rbac/hooks/use-staff-bridge";
import { DonorResearchLoading } from "../common/DonorResearchLoading";
import { ReportBrief } from "./ReportBrief";

interface ReportBriefViewProps {
  reportId: string;
}

/**
 * Terminal state for "we could not decide whether you may manage this report".
 * Deliberately NOT a silent downgrade to the read-only variant: a super-admin
 * whose permissions lookup timed out would otherwise see a report with its
 * controls missing and no way to tell that anything had gone wrong.
 */
function ManageAuthorizationError() {
  const queryClient = useQueryClient();
  const isRetrying = useIsFetching({ queryKey: permissionsKeys.all }) > 0;

  return (
    <div className="mx-auto max-w-xl px-4 py-12" role="alert">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          We couldn&apos;t verify your access
        </h1>
        <p className="text-sm text-muted-foreground">
          Checking your permissions took too long, so we can&apos;t show this report safely. Please
          try again.
        </p>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          disabled={isRetrying}
          onClick={() => {
            void queryClient.refetchQueries({ queryKey: permissionsKeys.all });
          }}
          type="button"
        >
          <RefreshCw className={isRetrying ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {isRetrying ? "Retrying…" : "Try again"}
        </button>
      </div>
    </div>
  );
}

/**
 * Authenticated report view for advisors AND staff (the API scopes what each
 * caller may read). Owns the data-fetching (React Query + SSE) and delegates
 * all rendering to {@link ReportBrief}, the same presentational component the
 * donor share view uses — so the surfaces stay visually identical.
 *
 * Write controls render only once the viewer is CONFIRMED as either the
 * report's advisor or staff — a resolving or absent advisor row gets the
 * read-only staff variant, never a flash of controls that would only error
 * for a non-owner. Staff get the ranking + share controls (the BE write
 * routes resolve staff to the report owner), but not the advisor-scoped
 * diligence actions.
 */
export function ReportBriefView({ reportId }: ReportBriefViewProps) {
  const reportQuery = useDonorReport(reportId);
  const advisorQuery = useDonorAdvisor();
  const { isStaff, isLoading: isStaffLoading, isError: isStaffError } = useStaff();
  const reportStatus = reportQuery.data?.status;
  const isTerminal =
    reportStatus === "complete" || reportStatus === "fast_complete" || reportStatus === "failed";
  const stream = useDonorReportStream(isTerminal ? null : reportId);

  // Management authorization (owner OR staff) must fully resolve before we pick
  // a variant or expose write controls. While RBAC or the advisor row is still
  // pending both `isStaff` and `isOwner` read `false`, so rendering here would
  // flash the read-only staff variant and then pop the controls in once it
  // settles — hold the skeleton until authorization is decided instead.
  const isManageAuthPending = isStaffLoading || advisorQuery.isPending;

  if (reportQuery.isLoading) {
    return <DonorResearchLoading label="Loading report…" variant="report" />;
  }

  if (reportQuery.isError) {
    throw reportQuery.error;
  }

  if (isManageAuthPending) {
    return <DonorResearchLoading label="Loading report…" variant="report" />;
  }

  const isOwner = !!advisorQuery.data && advisorQuery.data.id === reportQuery.data!.advisorId;

  // Staff authorization resolved to "unknown". Owners don't depend on it —
  // their controls come from the advisor row — so only a viewer we can't
  // confirm as the owner is actually blocked by it.
  if (isStaffError && !isOwner) {
    return <ManageAuthorizationError />;
  }

  return (
    <ReportBrief
      canManageReport={isOwner || isStaff}
      isTerminal={isTerminal}
      report={reportQuery.data!}
      stream={stream}
      variant={isOwner ? "advisor" : "staff"}
    />
  );
}
