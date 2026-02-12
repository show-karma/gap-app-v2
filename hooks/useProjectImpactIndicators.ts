import { useQuery } from "@tanstack/react-query";

import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export interface MetricData {
  lastUpdated: string;
  source: string;
  unit: string;
  value: number;
  breakdown?: Record<string, number>;
}

export interface ProjectImpactResponse {
  metrics: {
    gitCommits: MetricData | null;
    mergedPRs: MetricData | null;
    transactions: MetricData | null;
    uniqueUsers: MetricData | null;
  };
  projectTitle?: string;
  projectUID: string;
  period: string;
  timeRange: {
    endDate: string;
    startDate: string;
  };
}

function mapRangeToPeriod(range: number): "30d" | "90d" | "180d" | "1y" {
  switch (range) {
    case 90:
      return "90d";
    case 180:
      return "180d";
    case 360:
      return "1y";
    default:
      return "30d";
  }
}

export const useProjectImpactIndicators = (projectId: string, range: number = 30) => {
  const period = mapRangeToPeriod(range);

  return useQuery({
    queryKey: ["project-impact-indicators", projectId, range],
    queryFn: async () => {
      const [data, error] = await fetchData(
        INDEXER.INDICATORS.V2.DASHBOARD_METRICS(projectId, { period })
      );
      if (error) throw error;
      return data as ProjectImpactResponse;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
