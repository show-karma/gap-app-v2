import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useDonorAdvisor } from "@/hooks/useDonorAdvisor";
import { donorReportsQueryKey } from "@/hooks/useDonorReports";
import { listResearchReports } from "@/services/donor-research.service";
import type {
  DonorResearchReportStatus,
  ResearchReportList,
  ResearchReportListItem,
} from "@/types/donor-research";
import { PAGES } from "@/utilities/pages";
import type { BadgeTone, ModuleStatus, ModuleSummary } from "./primitives";

export const REPORTS_LIMIT = 6;

export function isTerminalReady(status: DonorResearchReportStatus): boolean {
  return status === "complete" || status === "fast_complete";
}

export function reportTitle(item: ResearchReportListItem): string {
  return item.donorHandleLabel || item.criteriaSummary || "Untitled research";
}

export function statusBadge(status: DonorResearchReportStatus): {
  tone: BadgeTone;
  label: string;
  icon: string;
} {
  if (isTerminalReady(status)) return { tone: "green", label: "Ready", icon: "check" };
  if (status === "failed") return { tone: "red", label: "Failed", icon: "clock" };
  return { tone: "amber", label: "Generating", icon: "clock" };
}

/* ── shared data hook (deduped between tile and full view) ─────── */

export interface AdvisorData {
  isAdvisor: boolean;
  advisorLoading: boolean;
  status: ModuleStatus;
  summary?: ModuleSummary;
  reports: ResearchReportListItem[];
  onRetry: () => void;
}

/**
 * Advisor summary data for the bento tile. Kept in its own module (separate
 * from the heavy `AdvisorFullView`) so the dashboard can call it eagerly while
 * the drill-in view is code-split and only downloaded on first open.
 */
export function useAdvisorData(authenticated: boolean): AdvisorData {
  const advisorQuery = useDonorAdvisor({ enabled: authenticated });
  const isAdvisor = advisorQuery.data != null;

  const reportsQuery = useQuery<ResearchReportList>({
    queryKey: donorReportsQueryKey({ limit: REPORTS_LIMIT }),
    queryFn: () => listResearchReports({ limit: REPORTS_LIMIT }),
    enabled: isAdvisor,
    // Keep the fetched list fresh so a re-enable (e.g. auth state settling on
    // load) returns cached data instead of refetching, matching the advisor query.
    staleTime: 5 * 60 * 1000,
  });

  const reports = reportsQuery.data?.items ?? [];

  let status: ModuleStatus;
  if (reportsQuery.isError) status = "error";
  else if (reportsQuery.isLoading) status = "loading";
  else if (reports.length === 0) status = "empty";
  else status = "ready";

  const summary: ModuleSummary | undefined =
    status === "ready"
      ? {
          big: reports.length,
          rows: reports.slice(0, 3).map((r) => {
            const b = statusBadge(r.status);
            return {
              icon: FileText,
              label: reportTitle(r),
              badge: { tone: b.tone, label: b.label },
              href: PAGES.DONOR_RESEARCH.REPORT(r.id),
            };
          }),
        }
      : undefined;

  return {
    isAdvisor,
    advisorLoading: advisorQuery.isLoading,
    status,
    summary,
    reports,
    onRetry: () => reportsQuery.refetch(),
  };
}
