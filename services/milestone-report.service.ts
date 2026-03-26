import type { PendingVerificationAPIResponse } from "@/hooks/usePendingVerificationMilestones";
import type { ReportAPIResponse } from "@/hooks/useReportPageData";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";

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
    proofOfWorkLinks: [],
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
    let url = `${INDEXER.COMMUNITY.REPORT.GET(communityId)}?limit=${pageLimit}&page=${page}&sort=${sortBy}&sortOrder=${sortOrder}${
      queryProgramIds ? `&programIds=${encodedProgramIds}` : ""
    }`;
    if (reviewerAddress) {
      url += `&reviewerAddress=${encodeURIComponent(reviewerAddress)}`;
    }

    const [data, error] = await fetchData<ReportAPIResponse>(url);
    if (error) throw new Error(String(error));
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

    const [data, error] = await fetchData<PendingVerificationAPIResponse>(url);
    if (error) throw new Error(String(error));
    return data || { data: [], pageInfo: { totalItems: 0, page: 1, pageLimit } };
  },
};
