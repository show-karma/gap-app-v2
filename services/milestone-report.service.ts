import type { PendingVerificationAPIResponse } from "@/hooks/usePendingVerificationMilestones";
import type { ReportAPIResponse } from "@/hooks/useReportPageData";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";

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

const EMPTY_REPORT_RESPONSE: ReportAPIResponse = {
  data: [],
  pageInfo: { totalItems: 0, page: 1, pageLimit: 50 },
  uniqueProjectCount: 0,
  stats: {
    totalGrants: 0,
    totalProjectsWithMilestones: 0,
    totalMilestones: 0,
    totalCompletedMilestones: 0,
    totalPendingMilestones: 0,
    percentageProjectsWithMilestones: 0,
    percentageCompletedMilestones: 0,
    percentagePendingMilestones: 0,
  },
};

export const milestoneReportService = {
  async getReport(
    communityId: string,
    page: number,
    pageLimit: number,
    sortBy = "totalMilestones",
    sortOrder = "desc",
    selectedProgramIds: string[] = [],
    reviewerAddress?: string
  ): Promise<ReportAPIResponse> {
    const normalizedProgramIds = selectedProgramIds.map(normalizeProgramId);
    const queryProgramIds = normalizedProgramIds.join(",");
    const encodedProgramIds = encodeURIComponent(queryProgramIds);
    // The V2 endpoint uses `pageLimit` and `sortField` (instead of V1's
    // `limit`/`sort`). Keep the same input contract for callers but adapt
    // the wire format here.
    let url = `${INDEXER.COMMUNITY.REPORT.GET(
      communityId
    )}?pageLimit=${pageLimit}&page=${page}&sortField=${sortBy}&sortOrder=${sortOrder}${
      queryProgramIds ? `&programIds=${encodedProgramIds}` : ""
    }`;
    if (reviewerAddress) {
      url += `&reviewerAddress=${encodeURIComponent(reviewerAddress)}`;
    }

    let data: ReportAPIResponse | null;
    try {
      // TODO(#1775): add zod schema
      data = await api.get<ReportAPIResponse>(url);
    } catch (error) {
      throw new Error(httpErrorMessage(error));
    }
    return data || { ...EMPTY_REPORT_RESPONSE, pageInfo: { totalItems: 0, page: 1, pageLimit } };
  },

  async getPendingVerification(
    communityId: string,
    page: number,
    pageLimit: number,
    programIds: string[] = [],
    reviewerAddress?: string
  ): Promise<PendingVerificationAPIResponse> {
    const queryProgramIds = programIds.join(",");
    const encodedProgramIds = encodeURIComponent(queryProgramIds);
    let url = `${INDEXER.COMMUNITY.REPORT.PENDING_VERIFICATION(communityId)}?limit=${pageLimit}&page=${page}${
      queryProgramIds ? `&programIds=${encodedProgramIds}` : ""
    }`;
    if (reviewerAddress) {
      url += `&reviewerAddress=${encodeURIComponent(reviewerAddress)}`;
    }

    let data: PendingVerificationAPIResponse | null;
    try {
      // TODO(#1775): add zod schema
      data = await api.get<PendingVerificationAPIResponse>(url);
    } catch (error) {
      throw new Error(httpErrorMessage(error));
    }
    return data || { data: [], pageInfo: { totalItems: 0, page: 1, pageLimit } };
  },
};
