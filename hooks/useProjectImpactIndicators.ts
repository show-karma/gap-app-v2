import { useQuery } from "@tanstack/react-query";

import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const useProjectImpactIndicators = (projectId: string, params?: { no_of_txs?: number; github_commits?: number }) => {
  return useQuery({
    queryKey: ["project-impact-indicators", projectId, params],
    queryFn: async () => {
      const [data, error] = await fetchData(
        INDEXER.INDICATORS.BY_TIMERANGE(projectId, params || { no_of_txs: 30, github_commits: 30 })
      );
      if (error) throw error;
      return data as Record<string, { totalValue: number; name: string; datapointCount: number }>;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};