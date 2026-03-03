import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { wlQueryKeys } from "@/src/lib/query-keys";
import type { FundingProgram } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export function useProgramsList(communityId: string | undefined) {
  const { address } = useAuth();

  return useQuery({
    queryKey: wlQueryKeys.programs.list(communityId ?? "", address ?? null),
    queryFn: async () => {
      if (!communityId) return [];
      const [res, err] = await fetchData<FundingProgram[]>(
        INDEXER.V2.FUNDING_PROGRAMS.BY_COMMUNITY_ACTIVE(communityId),
        "GET",
        {},
        {},
        {},
        true
      );
      if (err) throw new Error(err);
      return res;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!communityId,
  });
}
