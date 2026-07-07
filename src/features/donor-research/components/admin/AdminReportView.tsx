"use client";

import { useAdminReport } from "@/hooks/useAdminDonorResearch";
import { DonorResearchLoading } from "../common/DonorResearchLoading";
import { ReportBrief } from "../report-brief/ReportBrief";

interface AdminReportViewProps {
  reportId: string;
}

/**
 * Staff report view (DEV-467). Fetches any advisor's report via the staff
 * endpoint and delegates rendering to {@link ReportBrief} with the `shared`
 * variant — so staff see the identical brief minus advisor-only controls
 * (no share management, no live stream).
 */
export function AdminReportView({ reportId }: AdminReportViewProps) {
  const reportQuery = useAdminReport(reportId);
  const status = reportQuery.data?.status;
  const isTerminal = status === "complete" || status === "fast_complete" || status === "failed";

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
      variant="shared"
      stream={null}
    />
  );
}
