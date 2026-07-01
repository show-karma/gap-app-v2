"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAdminReport,
  type ListAdvisorsOptions,
  listAdvisors,
} from "@/services/donor-research-admin.service";
import type { AdminAdvisorsList, ResearchReportDetail } from "@/types/donor-research";

const adminAdvisorsQueryKey = (options: ListAdvisorsOptions = {}) =>
  ["donor-research", "admin", "advisors", options] as const;

const adminReportQueryKey = (reportId: string) =>
  ["donor-research", "admin", "report", reportId] as const;

/** Staff-only: paginated list of advisors with their donors + report links. */
export function useAdminAdvisors(options: ListAdvisorsOptions = {}) {
  return useQuery<AdminAdvisorsList>({
    queryKey: adminAdvisorsQueryKey(options),
    queryFn: () => listAdvisors(options),
  });
}

/** Staff-only: a single report rendered with the advisor's brief. */
export function useAdminReport(reportId: string | null) {
  return useQuery<ResearchReportDetail>({
    queryKey: adminReportQueryKey(reportId ?? ""),
    queryFn: () => getAdminReport(reportId as string),
    enabled: !!reportId,
  });
}
