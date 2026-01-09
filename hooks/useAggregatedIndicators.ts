"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";

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

// V2 API response types
interface V2AggregatedDatapoint {
  indicatorId: string;
  indicatorName: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  projectCount: number;
}

interface V2CommunityAggregatedIndicator {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  totalProjects: number;
  aggregatedData: V2AggregatedDatapoint[];
}

interface V2CommunityAggregateResponse {
  communityUID: string;
  timeRange: {
    startDate: string;
    endDate: string;
  };
  indicators: V2CommunityAggregatedIndicator[];
}

/**
 * Transform V2 API response to match existing AggregatedIndicator interface
 */
function transformV2Response(v2Response: V2CommunityAggregateResponse): AggregatedIndicator[] {
  return v2Response.indicators.map((indicator) => ({
    id: indicator.id,
    name: indicator.name,
    description: indicator.description,
    unitOfMeasure: indicator.unitOfMeasure,
    totalProjects: indicator.totalProjects,
    aggregatedData: indicator.aggregatedData.map((dp) => ({
      value: dp.totalValue,
      timestamp: dp.startDate, // Use start date as timestamp
    })),
  }));
}

export function useAggregatedIndicators(
  indicatorIds: string[],
  enabled: boolean = true,
  timeframeMonths: number = 1
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
    `last-${timeframeMonths}-months`,
  ];

  const queryFn = async (): Promise<AggregatedIndicator[]> => {
    if (!indicatorIds.length) return [];

    // First get the community details to obtain the UID
    const communityDetails = await getCommunityDetails(communityId as string);

    if (!communityDetails) {
      return [];
    }

    // Calculate date range based on selected timeframe
    const startDateObj = new Date();
    startDateObj.setMonth(startDateObj.getMonth() - timeframeMonths);
    const startDate = startDateObj.toISOString();
    const endDate = new Date().toISOString();

    // Parse programId to extract programId and chainId if in format "programId_chainId"
    let parsedProgramId: number | undefined;
    let parsedChainId: number | undefined;
    if (programId) {
      const parts = programId.split("_");
      if (parts.length === 2) {
        parsedProgramId = parseInt(parts[0], 10);
        parsedChainId = parseInt(parts[1], 10);
      }
    }

    // Use V2 community aggregate endpoint
    const [data, error] = await fetchData(
      INDEXER.INDICATORS.V2.COMMUNITY_AGGREGATE(communityDetails.uid, {
        indicatorIds: indicatorIds.join(","),
        programId: parsedProgramId,
        chainId: parsedChainId,
        startDate,
        endDate,
        granularity: "monthly",
      })
    );

    if (error) {
      throw error;
    }

    // Transform V2 response to match existing interface
    return transformV2Response(data as V2CommunityAggregateResponse);
  };

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!communityId && enabled && indicatorIds.length > 0,
  });
}
