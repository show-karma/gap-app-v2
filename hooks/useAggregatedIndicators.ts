"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import type { CommunityAggregateResponse } from "@/types/indicator";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";
import { QUERY_KEYS } from "@/utilities/queryKeys";

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

/**
 * Transform API response to match existing AggregatedIndicator interface
 */
function transformResponse(response: CommunityAggregateResponse): AggregatedIndicator[] {
  return response.indicators.map((indicator) => ({
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
  const projectUID = searchParams.get("projectId")?.trim() || null;
  const programIdParam = searchParams.get("programId")?.trim() || null;

  // Parse programId safely - handle invalid input
  const programIdNum = programIdParam ? parseInt(programIdParam, 10) : NaN;
  const parsedProgramId = Number.isNaN(programIdNum) ? undefined : programIdNum;

  const queryKey = QUERY_KEYS.INDICATORS.AGGREGATED({
    indicatorIds: indicatorIds.join(","),
    communityId: String(communityId || ""),
    programId: programIdParam || "all",
    projectUID: projectUID || "all",
    timeframe: `last-${timeframeMonths}-months`,
  });

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

    // Fetch community aggregate indicators
    const [data, error] = await fetchData(
      INDEXER.INDICATORS.V2.COMMUNITY_AGGREGATE(communityDetails.uid, {
        indicatorIds: indicatorIds.join(","),
        programId: parsedProgramId,
        projectUID: projectUID || undefined,
        startDate,
        endDate,
        granularity: "monthly",
      })
    );

    if (error) {
      throw error;
    }

    // Transform response to match existing interface
    return transformResponse(data as CommunityAggregateResponse);
  };

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!communityId && enabled && indicatorIds.length > 0,
  });
}
