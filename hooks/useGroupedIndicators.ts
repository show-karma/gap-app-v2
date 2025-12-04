import { type QueryKey, type QueryOptions, useQuery } from "@tanstack/react-query";
import {
  type GroupedIndicators,
  getGroupedIndicatorsByCommunity,
} from "@/utilities/queries/getIndicatorsByCommunity";

interface UseGroupedIndicatorsProps {
  communityId: string;
  queryOptions?: QueryOptions<GroupedIndicators, Error, GroupedIndicators, QueryKey>;
}

export const useGroupedIndicators = ({ communityId, queryOptions }: UseGroupedIndicatorsProps) => {
  return useQuery<GroupedIndicators>({
    queryKey: ["groupedIndicators", communityId],
    queryFn: () => getGroupedIndicatorsByCommunity(communityId),
    enabled: !!communityId,
    ...queryOptions,
  });
};
