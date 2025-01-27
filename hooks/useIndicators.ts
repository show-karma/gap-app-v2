import {
  Indicator,
  getIndicatorsByCommunity,
} from "@/utilities/queries/getIndicatorsByCommunity";
import { QueryKey, QueryOptions, useQuery } from "@tanstack/react-query";

interface UseIndicatorsProps {
  communityId: string;
  getBy?: "community" | "category";
  queryOptions?: QueryOptions<Indicator[], Error, Indicator[], QueryKey>;
}

export const useIndicators = ({
  communityId,
  getBy = "community",
  queryOptions,
}: UseIndicatorsProps) => {
  return useQuery<Indicator[]>({
    queryKey: ["indicators", communityId],
    queryFn: () => getIndicatorsByCommunity(communityId),
    enabled: !!communityId,
    ...queryOptions,
  });
};
