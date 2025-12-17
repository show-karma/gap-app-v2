"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { EcosystemMetricsResponse } from "@/types/ecosystem-metrics";
import {
  type GetEcosystemMetricsParams,
  getEcosystemMetrics,
} from "@/utilities/registry/getEcosystemMetrics";

export function useEcosystemMetrics(params?: GetEcosystemMetricsParams, enabled: boolean = true) {
  const { communityId } = useParams();

  const queryKey = [
    "ecosystem-metrics",
    communityId,
    params?.startDate || "all",
    params?.endDate || "all",
    params?.metricNames || "all",
  ];

  const queryFn = async (): Promise<EcosystemMetricsResponse | null> => {
    if (!communityId || Array.isArray(communityId)) return null;
    return await getEcosystemMetrics(communityId, params);
  };

  return useQuery<EcosystemMetricsResponse | null>({
    queryKey,
    queryFn,
    enabled: enabled && !!communityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
