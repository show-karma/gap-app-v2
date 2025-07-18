import { useQuery } from "@tanstack/react-query";

import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const useProjectImpactIndicators = (projectId: string, params?: { [key: string]: number }) => {
  return useQuery({
    queryKey: ["project-impact-indicators", projectId, params],
    queryFn: async () => {
      const [data, error] = await fetchData(
        INDEXER.INDICATORS.BY_TIMERANGE(projectId, params || { })
      );
      if (error) throw error;
      return data as Record<string, { totalValue: number; name: string; datapointCount: number }>;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};