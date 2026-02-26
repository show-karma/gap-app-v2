import { useQuery } from "@tanstack/react-query";
import { milestoneReportService } from "@/services/milestone-report.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";

export interface PendingVerificationMilestone {
  milestoneUid: string;
  milestoneTitle: string;
  completedAt: string | null;
  grantUid: string;
  grantTitle: string;
  programId: string | null;
  projectUid: string;
  projectTitle: string;
  projectSlug: string;
  status: "pending_verification" | "pending_completion";
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
  const query = useQuery<PendingVerificationAPIResponse>({
    queryKey: QUERY_KEYS.COMMUNITY.PENDING_VERIFICATION(communityId, page, programIds),
    queryFn: () =>
      milestoneReportService.getPendingVerification(communityId, page, pageLimit, programIds),
    enabled: Boolean(communityId) && enabled,
  });

  return {
    data: query.data?.data ?? [],
    pageInfo: query.data?.pageInfo ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
};
