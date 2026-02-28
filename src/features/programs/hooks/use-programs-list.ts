import { useQuery } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import type { FundingProgram } from "@/types/whitelabel-entities";

export function useProgramsList(communityId: string | undefined) {
  return useQuery({
    queryKey: ["wl-programs-list", communityId],
    queryFn: async () => {
      if (!communityId) return [];
      const [res, err] = await fetchData<FundingProgram[]>(
        `/v2/funding-program-configs/community/${communityId}?status=active&limit=100`,
        "GET",
        {},
        {},
        {},
        true,
      );
      if (err) throw new Error(err);
      return res;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!communityId,
  });
}
