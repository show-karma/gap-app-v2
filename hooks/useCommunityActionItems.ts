import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import {
  type CommunityActionItemFilters,
  getCommunityActionItems,
} from "@/services/milestoneActionItemsService";

export function useCommunityActionItems(
  communityId: string,
  filters: CommunityActionItemFilters,
  enabled: boolean
) {
  return useQuery({
    queryKey: QUERY_KEYS.communityActionItems(communityId, filters),
    queryFn: () => getCommunityActionItems(communityId, filters),
    enabled: enabled && Boolean(communityId),
    staleTime: 60_000,
  });
}
