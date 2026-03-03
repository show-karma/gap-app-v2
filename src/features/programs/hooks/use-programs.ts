import { useQuery } from "@tanstack/react-query";
import type { FundingProgram, ProgramFilters } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { useProgramsStore } from "../lib/store";
import type { UseProgramsReturn } from "../types";

export function usePrograms(
  communityId: string,
  initialFilters?: ProgramFilters
): UseProgramsReturn {
  const { filters: storeFilters, setFilters } = useProgramsStore();
  const filters = { ...initialFilters, ...storeFilters };

  const { data, isLoading, error, refetch } = useQuery<{
    programs: FundingProgram[];
    limit: number;
  }>({
    queryKey: ["wl-programs", communityId, filters],
    queryFn: async () => {
      const limit = filters.limit || 20;
      const params = new URLSearchParams();
      params.set("page", String(filters.page || 1));
      params.set("limit", String(limit));
      if (filters.status) params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      const [res, err] = await fetchData<FundingProgram[]>(
        `/v2/funding-program-configs/community/${communityId}?${params.toString()}`,
        "GET",
        {},
        {},
        {},
        true
      );
      if (err) throw new Error(err);
      return { programs: res ?? [], limit };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!communityId,
  });

  const programs = data?.programs ?? [];
  const limit = data?.limit ?? (filters.limit || 20);

  return {
    programs,
    loading: isLoading,
    error: error as Error | null,
    filters,
    setFilters,
    refetch,
    // If we received exactly `limit` items, there may be more pages
    hasMore: programs.length >= limit,
    totalCount: programs.length,
  };
}
