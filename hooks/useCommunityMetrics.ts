"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { CommunityMetricsResponse } from "@/types/community-metrics";
import {
  type GetCommunityMetricsParams,
  getCommunityMetrics,
} from "@/utilities/registry/getCommunityMetrics";

export function useCommunityMetrics(params?: GetCommunityMetricsParams, enabled: boolean = true) {
  const { communityId } = useParams();

  const queryKey = [
    "community-metrics",
    communityId,
    params?.startDate || "all",
    params?.endDate || "all",
    params?.metricNames || "all",
  ];

  const queryFn = async (): Promise<CommunityMetricsResponse | null> => {
    if (!communityId || Array.isArray(communityId)) return null;
    return await getCommunityMetrics(communityId, params);
  };

  return useQuery<CommunityMetricsResponse | null>({
    queryKey,
    queryFn,
    enabled: enabled && !!communityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
