import { useQuery } from "@tanstack/react-query";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAuth } from "@/hooks/useAuth";
import { wlQueryKeys } from "@/src/lib/query-keys";
import type { FundingProgram } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

export function useProgramsList(communityId: string | undefined) {
  const { address } = useAuth();

  return useQuery({
    queryKey: wlQueryKeys.programs.list(communityId ?? "", address ?? null),
    queryFn: async () => {
      if (!communityId) return [];
      try {
        // TODO(#1775): add zod schema
        return await api.get<FundingProgram[]>(
          INDEXER.V2.FUNDING_PROGRAMS.BY_COMMUNITY_ACTIVE(communityId)
        );
      } catch (error) {
        // Any failure (including a missing/erroring community) degrades to an
        // empty list so the program selector renders "no programs" instead
        // of throwing and blanking the browse-applications page.
        errorManager(`Error fetching programs list for community: ${communityId}`, error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!communityId,
  });
}
