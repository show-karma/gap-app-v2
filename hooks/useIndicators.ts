import { type QueryKey, type QueryOptions, useQuery } from "@tanstack/react-query";
import {
  getIndicatorsByCommunity,
  type Indicator,
} from "@/utilities/queries/getIndicatorsByCommunity";

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
