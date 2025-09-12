"use client";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { getCommunityDetailsV2 } from "@/utilities/queries/getCommunityDataV2";

export interface AggregatedIndicator {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  totalProjects: number;
  aggregatedData: {
    value: number;
    timestamp: string;
    proof?: string;
  }[];
}

export function useAggregatedIndicators(
  indicatorIds: string[],
  enabled: boolean = true
) {
  const { communityId } = useParams();
  const searchParams = useSearchParams();
  const projectUID = searchParams.get("projectId");
  const programId = searchParams.get("programId");

  const queryKey = [
    "aggregated-indicators",
    indicatorIds.join(","),
    communityId,
    programId || "all",
    projectUID || "all",
    "last-3-months", // Include date range in cache key
  ];

  const queryFn = async (): Promise<AggregatedIndicator[]> => {
    if (!indicatorIds.length) return [];
    
    // First get the community details to obtain the UID
    const communityDetails = await getCommunityDetailsV2(communityId as string);
    
    // Default to last 3 months for better performance
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const startDate = threeMonthsAgo.toISOString();
    const endDate = new Date().toISOString();
    
    // Call the new aggregated indicators endpoint
    const [data, error] = await fetchData(
      INDEXER.COMMUNITY.V2.INDICATORS.AGGREGATED(
        indicatorIds.join(","),
        communityDetails.uid,
        programId || undefined,
        projectUID || undefined,
        startDate,
        endDate
      )
    );
    
    if (error) {
      throw error;
    }

    return data || [];
  };

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!communityId && enabled && indicatorIds.length > 0,
  });
}
