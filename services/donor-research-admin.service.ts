import type { AdminAdvisorsList } from "@/types/donor-research";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";

/**
 * Staff-only donor-research admin API client. Kept separate from the
 * advisor-facing `donor-research.service` so that file stays under the size
 * budget. All calls are staff-guarded server-side; the routes are also gated
 * on `isStaff` in the FE. Report reads have no admin variant — staff open the
 * regular advisor endpoint, which grants staff an unscoped read.
 */

/**
 * Extracts the same human-readable error message the legacy `fetchData`
 * adapter surfaced for an `HttpError`: prefer the server response body's
 * `message`, then the original axios error's message, then the client's
 * synthetic message. Falls back to a plain `Error.message` (or
 * `String(error)`) for non-HTTP `ApiError`s.
 */
function httpErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const bodyMessage = (error.body as { message?: string } | undefined)?.message;
    const causeMessage = (error.cause as { message?: string } | undefined)?.message;
    return bodyMessage || causeMessage || error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

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

  let data: AdminAdvisorsList | null;
  try {
    // TODO(#1775): add zod schema
    data = await api.get<AdminAdvisorsList>(INDEXER.DONOR_RESEARCH.ADMIN_ADVISORS, { params });
  } catch (error) {
    throw new Error(httpErrorMessage(error) || "Failed to load advisors");
  }
  if (!data) {
    throw new Error("Failed to load advisors");
  }
  return data;
};
