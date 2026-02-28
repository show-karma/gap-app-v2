import { useQuery } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import type { FundingProgram, ProgramFilters } from "@/types/whitelabel-entities";
import { useProgramsStore } from "../lib/store";
import type { UseProgramsReturn } from "../types";

export function usePrograms(
  communityId: string,
  initialFilters?: ProgramFilters,
): UseProgramsReturn {
  const { filters: storeFilters, setFilters } = useProgramsStore();
  const filters = { ...initialFilters, ...storeFilters };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wl-programs", communityId, filters],
    queryFn: async () => {
      const [res, err] = await fetchData<FundingProgram[]>(
        `/v2/funding-program-configs/community/${communityId}?page=${filters.page || 1}&limit=${filters.limit || 20}`,
        "GET",
        {},
        {},
        {},
        true,
      );
      if (err) throw new Error(err);
      return res;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!communityId,
  });

  return {
    programs: data || [],
    loading: isLoading,
    error: error as Error | null,
    filters,
    setFilters,
    refetch,
    hasMore: false,
    totalCount: data?.length || 0,
  };
}
