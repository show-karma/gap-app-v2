import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { wlQueryKeys } from "@/src/lib/query-keys";
import type { FundingProgram, ProgramFilters } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import { DEFAULT_PROGRAMS_LIMIT, PROGRAMS_LIST_STALE_TIME } from "../lib/constants";
import { matchesStatus } from "../lib/program-status";
import { useProgramsStore } from "../lib/store";
import type { UseProgramsReturn } from "../types";

export function usePrograms(
  communityId: string,
  initialFilters?: ProgramFilters
): UseProgramsReturn {
  const {
    filters: storeFilters,
    setFilters,
    applyAutoFilters,
    hasUserChangedFilters,
  } = useProgramsStore();
  const filters = { ...initialFilters, ...storeFilters };

  const { data, isLoading, error, refetch } = useQuery<{
    programs: FundingProgram[];
    limit: number;
  }>({
    queryKey: wlQueryKeys.programs.communityList(communityId),
    queryFn: async () => {
      const limit = filters.limit || DEFAULT_PROGRAMS_LIMIT;
      // TODO(#1775): add zod schema
      const res = await api.get<FundingProgram[]>(
        INDEXER.V2.FUNDING_PROGRAMS.BY_COMMUNITY(encodeURIComponent(communityId))
      );
      return { programs: res ?? [], limit };
    },
    staleTime: PROGRAMS_LIST_STALE_TIME,
    enabled: !!communityId,
  });

  const allPrograms = data?.programs ?? [];
  const limit = data?.limit ?? (filters.limit || 20);

  const programs = useMemo(() => {
    let result = allPrograms;
    if (filters.status) {
      result = result.filter((p) => matchesStatus(p, filters.status!));
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.metadata?.title?.toLowerCase().includes(term) ||
          p.metadata?.description?.toLowerCase().includes(term) ||
          p.name?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [allPrograms, filters.status, filters.search]);

  // If the default Active filter is in effect but the community has no active
  // programs, fall back to showing all so the page isn't empty by default.
  // Only triggers on the default state — once the user changes the filter,
  // their choice is respected even on subsequent visits.
  const fetchedPrograms = data?.programs;
  useEffect(() => {
    if (!fetchedPrograms || fetchedPrograms.length === 0) return;
    if (hasUserChangedFilters) return;
    if (storeFilters.status !== "active") return;
    if (fetchedPrograms.some((p) => matchesStatus(p, "active"))) return;

    const { status: _status, ...rest } = storeFilters;
    applyAutoFilters(rest);
  }, [fetchedPrograms, hasUserChangedFilters, storeFilters, applyAutoFilters]);

  return {
    programs,
    loading: isLoading,
    error: error as Error | null,
    filters,
    setFilters,
    refetch,
    hasMore: programs.length >= limit,
    totalCount: programs.length,
  };
}
