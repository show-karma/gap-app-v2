"use client";

import { useDonorReportStream } from "@/hooks/useDonorReportStream";
import { useDonorReport } from "@/hooks/useDonorReports";
import { DonorResearchLoading } from "../common/DonorResearchLoading";
import { ReportBrief } from "./ReportBrief";

interface ReportBriefViewProps {
  reportId: string;
}

/**
 * Authenticated advisor report view. Owns the data-fetching (React Query +
 * SSE) and delegates all rendering to {@link ReportBrief}, the same
 * presentational component the donor share view uses — so the two surfaces
 * stay visually identical.
 */
export function ReportBriefView({ reportId }: ReportBriefViewProps) {
  const reportQuery = useDonorReport(reportId);
  const reportStatus = reportQuery.data?.status;
  const isTerminal =
    reportStatus === "complete" || reportStatus === "fast_complete" || reportStatus === "failed";
  const stream = useDonorReportStream(isTerminal ? null : reportId);

  if (reportQuery.isLoading) {
    return <DonorResearchLoading label="Loading report…" />;
  }

  if (reportQuery.isError) {
    throw reportQuery.error;
  }

  return (
    <ReportBrief
      report={reportQuery.data!}
      isTerminal={isTerminal}
      variant="advisor"
      stream={stream}
    />
  );
}
