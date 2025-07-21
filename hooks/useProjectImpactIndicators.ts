import { useQuery } from "@tanstack/react-query";

import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

// New type definitions for the updated API response
export interface MetricData {
  lastUpdated: string;
  source: string;
  unit: string;
  value: number;
}

export interface ProjectImpactResponse {
  metrics: {
    gitCommits: MetricData;
    mergedPRs: MetricData;
    transactions: MetricData;
    uniqueUsers: MetricData;
  };
  projectTitle: string;
  projectUID: string;
  timeRange: {
    endDate: string;
    startDate: string;
  };
}

export const useProjectImpactIndicators = (projectId: string, range: number = 30) => {
  return useQuery({
    queryKey: ["project-impact-indicators", projectId, range],
    queryFn: async () => {
      const [data, error] = await fetchData(
        INDEXER.INDICATORS.BY_TIMERANGE(projectId, { range })
      );
      if (error) throw error;
      return data as ProjectImpactResponse;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};