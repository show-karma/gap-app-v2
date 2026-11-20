import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import { fetchFollowUpCase, fetchFollowUpCases } from "@/services/followUpAgent.service";

const CASES_PAGE_SIZE = 20;
const REFRESH_MS = 30 * 1000;

export function useFollowUpCases(programId: string, page: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.followUpCases(programId, page),
    queryFn: () => fetchFollowUpCases(programId, page, CASES_PAGE_SIZE),
    enabled: (options?.enabled ?? true) && !!programId,
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
  });
}

export function useFollowUpCase(programId: string, milestoneUid: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.followUpCase(programId, milestoneUid ?? ""),
    queryFn: () => fetchFollowUpCase(programId, milestoneUid as string),
    enabled: !!programId && !!milestoneUid,
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
  });
}
