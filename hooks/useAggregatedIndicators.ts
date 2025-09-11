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

  const queryKey = [
    "aggregated-indicators",
    indicatorIds.join(","),
    communityId,
    projectUID || "all",
  ];

  const queryFn = async (): Promise<AggregatedIndicator[]> => {
    if (!indicatorIds.length) return [];
    
    // First get the community details to obtain the UID
    const communityDetails = await getCommunityDetailsV2(communityId as string);
    
    // Call the new aggregated indicators endpoint
    const [data, error] = await fetchData(
      INDEXER.COMMUNITY.V2.INDICATORS.AGGREGATED(
        indicatorIds.join(","),
        communityDetails.uid,
        projectUID || undefined
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
