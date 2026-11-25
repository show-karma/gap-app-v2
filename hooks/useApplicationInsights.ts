import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import {
  fetchApplicationTrackRecord,
  fetchProjectIndicators,
} from "@/services/applicationInsights.service";

const INSIGHTS_STALE_TIME_MS = 5 * 60_000;

export function useApplicationTrackRecord(referenceNumber: string) {
  return useQuery({
    queryKey: QUERY_KEYS.applicationTrackRecord(referenceNumber),
    queryFn: () => fetchApplicationTrackRecord(referenceNumber),
    enabled: !!referenceNumber,
    staleTime: INSIGHTS_STALE_TIME_MS,
  });
}

export function useProjectIndicatorSeries(projectUID: string | null | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.projectIndicatorSeries(projectUID ?? ""),
    queryFn: () => fetchProjectIndicators(projectUID ?? ""),
    enabled: !!projectUID,
    staleTime: INSIGHTS_STALE_TIME_MS,
  });
}
