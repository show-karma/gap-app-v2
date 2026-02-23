import { useQuery } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";

export interface PendingVerificationMilestone {
  projectTitle: string;
  projectSlug: string;
  projectUid: string;
  grantTitle: string;
  grantUid: string;
  milestoneTitle: string;
  milestoneIndex: number;
  programId?: string;
}

export interface PendingVerificationAPIResponse {
  data: PendingVerificationMilestone[];
  pageInfo: {
    totalItems: number;
    page: number;
    pageLimit: number;
  };
}

interface UsePendingVerificationMilestonesOptions {
  communityId: string;
  page: number;
  pageLimit: number;
  programIds?: string[];
  enabled?: boolean;
}

export const usePendingVerificationMilestones = ({
  communityId,
  page,
  pageLimit,
  programIds = [],
  enabled = true,
}: UsePendingVerificationMilestonesOptions) => {
  const normalizedProgramIds = programIds.map((id) => (id.includes("_") ? id.split("_")[0] : id));

  const query = useQuery<PendingVerificationAPIResponse>({
    queryKey: QUERY_KEYS.COMMUNITY.PENDING_VERIFICATION(communityId, page, normalizedProgramIds),
    queryFn: async () => {
      const queryProgramIds = normalizedProgramIds.join(",");
      const encodedProgramIds = encodeURIComponent(queryProgramIds);
      const url = `${INDEXER.COMMUNITY.REPORT.PENDING_VERIFICATION(communityId)}?limit=${pageLimit}&page=${page}${queryProgramIds ? `&programIds=${encodedProgramIds}` : ""}`;
      const [data]: any = await fetchData(url);
      return data || { data: [], pageInfo: { totalItems: 0, page: 1, pageLimit } };
    },
    enabled: Boolean(communityId) && enabled,
  });

  return {
    data: query.data?.data ?? [],
    pageInfo: query.data?.pageInfo ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
};
