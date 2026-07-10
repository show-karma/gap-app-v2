import type { AdminAdvisorsList } from "@/types/donor-research";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Staff-only donor-research admin API client. Kept separate from the
 * advisor-facing `donor-research.service` so that file stays under the size
 * budget. All calls are staff-guarded server-side; the routes are also gated
 * on `isStaff` in the FE. Report reads have no admin variant — staff open the
 * regular advisor endpoint, which grants staff an unscoped read.
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
