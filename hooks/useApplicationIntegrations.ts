import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import {
  fetchApplicationIntegrations,
  fetchSimocracyEvaluations,
} from "@/services/fundingApplicationIntegrations.service";

const INTEGRATIONS_STALE_TIME_MS = 60_000;

export function useApplicationIntegrations(referenceNumber: string) {
  return useQuery({
    queryKey: QUERY_KEYS.applicationIntegrations(referenceNumber),
    queryFn: () => fetchApplicationIntegrations(referenceNumber),
    enabled: !!referenceNumber,
    staleTime: INTEGRATIONS_STALE_TIME_MS,
  });
}

export function useSimocracyEvaluations(referenceNumber: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.simocracyEvaluations(referenceNumber),
    queryFn: () => fetchSimocracyEvaluations(referenceNumber),
    enabled: (options?.enabled ?? true) && !!referenceNumber,
    staleTime: INTEGRATIONS_STALE_TIME_MS,
  });
}
