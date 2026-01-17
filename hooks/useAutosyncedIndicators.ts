import { useQuery } from "@tanstack/react-query";
import {
  getAutosyncedIndicators,
  type Indicator,
} from "@/utilities/queries/getIndicatorsByCommunity";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Hook to fetch auto-synced (system) indicators from the API
 * These are indicators with syncType='auto' that are managed by the system
 */
export const useAutosyncedIndicators = () => {
  return useQuery<Indicator[]>({
    queryKey: QUERY_KEYS.INDICATORS.AUTOSYNCED,
    queryFn: getAutosyncedIndicators,
    staleTime: 5 * 60 * 1000, // 5 minutes - these don't change often
  });
};
