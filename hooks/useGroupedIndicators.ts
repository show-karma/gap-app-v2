import {
  GroupedIndicators,
  getGroupedIndicatorsByCommunity,
} from "@/utilities/queries/getIndicatorsByCommunity";
import { QueryKey, QueryOptions, useQuery } from "@tanstack/react-query";

interface UseGroupedIndicatorsProps {
  communityId: string;
  queryOptions?: QueryOptions<GroupedIndicators, Error, GroupedIndicators, QueryKey>;
}

export const useGroupedIndicators = ({
  communityId,
  queryOptions,
}: UseGroupedIndicatorsProps) => {
  return useQuery<GroupedIndicators>({
    queryKey: ["groupedIndicators", communityId],
    queryFn: () => getGroupedIndicatorsByCommunity(communityId),
    enabled: !!communityId,
    ...queryOptions,
  });
}; 