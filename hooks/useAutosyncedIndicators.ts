import { useQuery } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import type { Indicator, PaginatedResponse } from "@/utilities/queries/getIndicatorsByCommunity";

interface V2Indicator {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  programs?: { programId: number; chainID: number }[] | null;
  communityUID?: string | null;
  syncType?: "auto" | "manual";
  createdAt?: string;
  updatedAt?: string;
}

function transformIndicator(v2Indicator: V2Indicator): Indicator {
  return {
    ...v2Indicator,
    programs:
      v2Indicator.programs?.map((p) => ({
        programId: String(p.programId),
        chainID: p.chainID,
      })) || undefined,
  };
}

/**
 * Fetch all auto-synced (system) indicators
 * These are indicators with syncType='auto' that are managed by the system
 */
async function fetchAutosyncedIndicators(): Promise<Indicator[]> {
  const allIndicators: Indicator[] = [];
  let currentPage = 1;
  let hasMore = true;
  const pageSize = 100;
  const maxPages = 10; // Safety limit

  while (hasMore && currentPage <= maxPages) {
    const [data, error] = await fetchData(
      INDEXER.INDICATORS.V2.LIST({ syncType: "auto", page: currentPage, limit: pageSize })
    );

    if (error) {
      throw error;
    }

    const paginatedData = data as PaginatedResponse<V2Indicator>;
    const indicators = (paginatedData.payload || []).map(transformIndicator);
    allIndicators.push(...indicators);

    hasMore = paginatedData.pagination.hasNextPage;
    currentPage++;
  }

  return allIndicators;
}

/**
 * Hook to fetch auto-synced indicators from the API
 */
export const useAutosyncedIndicators = () => {
  return useQuery<Indicator[]>({
    queryKey: ["indicators", "autosynced"],
    queryFn: fetchAutosyncedIndicators,
    staleTime: 5 * 60 * 1000, // 5 minutes - these don't change often
  });
};
