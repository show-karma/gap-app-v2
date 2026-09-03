import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { donorEntitlementQueryKey } from "@/hooks/useDonorBilling";
import {
  type CreateReportRequest,
  createResearchReport,
  getResearchReport,
  type ListReportsOptions,
  listResearchReports,
} from "@/services/donor-research.service";
import { isReportQuotaExhausted } from "@/services/donor-research-billing.service";
import type {
  ReportCreateResponse,
  ResearchReportDetail,
  ResearchReportList,
} from "@/types/donor-research";

export const donorReportsQueryKey = (options: ListReportsOptions = {}) =>
  ["donor-research", "reports", options] as const;

export const donorReportQueryKey = (reportId: string) =>
  ["donor-research", "report", reportId] as const;

export function useDonorReports(options: ListReportsOptions = {}) {
  return useQuery<ResearchReportList>({
    queryKey: donorReportsQueryKey(options),
    queryFn: () => listResearchReports(options),
  });
}

/**
 * Loads a single research report. While the report is in a non-terminal
 * status (running_fast / enriching / re_enriching) the hook polls every
 * 5 seconds so the UI tracks server-side state without depending on the
 * SSE stream — useful for tab switches and reconnects.
 */
export function useDonorReport(reportId: string | null) {
  return useQuery<ResearchReportDetail>({
    queryKey: donorReportQueryKey(reportId ?? ""),
    queryFn: () => getResearchReport(reportId as string),
    enabled: !!reportId,
    refetchInterval: (query) => {
      const report = query.state.data;
      if (!report) return 5_000;
      const isTerminal =
        report.status === "complete" ||
        report.status === "fast_complete" ||
        report.status === "failed";
      return isTerminal ? false : 5_000;
    },
  });
}

export function useCreateDonorReport() {
  const queryClient = useQueryClient();
  return useMutation<ReportCreateResponse, Error, CreateReportRequest>({
    mutationFn: (body: CreateReportRequest) => createResearchReport(body),
    onSuccess: () => {
      // Refresh the report list — the new pending row should appear at
      // the top once the user navigates back from the detail view.
      queryClient.invalidateQueries({
        queryKey: ["donor-research", "reports"],
      });
      // A successful create spent a report, so the header badge and billing
      // page are now stale.
      queryClient.invalidateQueries({ queryKey: donorEntitlementQueryKey });
    },
    onError: (error) => {
      // A quota refusal means the cached allowance disagrees with the server
      // (a report ran in another tab, or a subscription lapsed). Re-read it so
      // the upgrade prompt shows the real numbers.
      if (isReportQuotaExhausted(error)) {
        queryClient.invalidateQueries({ queryKey: donorEntitlementQueryKey });
      }
    },
  });
}
