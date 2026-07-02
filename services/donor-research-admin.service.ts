import type { AdminAdvisorsList, ResearchReportDetail } from "@/types/donor-research";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Staff-only donor-research admin API client (DEV-467). Kept separate from the
 * advisor-facing `donor-research.service` so that file stays under the size
 * budget. All calls are staff-guarded server-side; the routes are also gated
 * on `isStaff` in the FE.
 */

export interface ListAdvisorsOptions {
  page?: number;
  limit?: number;
  /** Case-insensitive search across wallet, name, org, handle label, and email. */
  search?: string;
}

/**
 * Lists every donor-research advisor with their donors and report links. A
 * non-staff caller gets a 403 that surfaces as a thrown error here.
 */
export const listAdvisors = async (
  options: ListAdvisorsOptions = {}
): Promise<AdminAdvisorsList> => {
  const params: Record<string, number | string> = {};
  if (options.page !== undefined) params.page = options.page;
  if (options.limit !== undefined) params.limit = options.limit;
  if (options.search) params.search = options.search;
  const [data, error] = await fetchData<AdminAdvisorsList>(
    INDEXER.DONOR_RESEARCH.ADMIN_ADVISORS,
    "GET",
    {},
    params
  );
  if (error || !data) {
    throw new Error(error || "Failed to load advisors");
  }
  return data;
};

/**
 * Reads any advisor's report with the same shape the advisor sees, so the
 * admin view renders the identical brief.
 */
export const getAdminReport = async (reportId: string): Promise<ResearchReportDetail> => {
  const [data, error] = await fetchData<ResearchReportDetail>(
    INDEXER.DONOR_RESEARCH.ADMIN_REPORT_BY_ID(reportId)
  );
  if (error || !data) {
    throw new Error(error || "Failed to load report");
  }
  return data;
};
