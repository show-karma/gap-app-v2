"use client";

import { useDonorAdvisor } from "@/hooks/useDonorAdvisor";
import { useDonorReportStream } from "@/hooks/useDonorReportStream";
import { useDonorReport } from "@/hooks/useDonorReports";
import { useStaff } from "@/src/core/rbac/hooks/use-staff-bridge";
import { DonorResearchLoading } from "../common/DonorResearchLoading";
import { ReportBrief } from "./ReportBrief";

interface ReportBriefViewProps {
  reportId: string;
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
  const { isStaff } = useStaff();
  const reportStatus = reportQuery.data?.status;
  const isTerminal =
    reportStatus === "complete" || reportStatus === "fast_complete" || reportStatus === "failed";
  const stream = useDonorReportStream(isTerminal ? null : reportId);

  if (reportQuery.isLoading) {
    return <DonorResearchLoading label="Loading report…" variant="report" />;
  }

  if (reportQuery.isError) {
    throw reportQuery.error;
  }

  const isOwner = !!advisorQuery.data && advisorQuery.data.id === reportQuery.data!.advisorId;

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
