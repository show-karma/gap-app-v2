import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import type { FundingProgram, ProgramFilters, ProgramStatus } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { useProgramsStore } from "../lib/store";
import type { UseProgramsReturn } from "../types";

function matchesStatus(program: FundingProgram, status: ProgramStatus): boolean {
  const now = new Date();
  const endsAt = program.metadata?.endsAt ? new Date(program.metadata.endsAt) : null;
  const startsAt = program.metadata?.startsAt ? new Date(program.metadata.startsAt) : null;
  const isEnabled = program.applicationConfig?.isEnabled ?? false;
  const hasDeadlinePassed = !!endsAt && now > endsAt;
  const isUpcoming = !!startsAt && now < startsAt;

  switch (status) {
    case "ended":
      // A program is "ended" if its deadline has passed, or if applications are
      // closed (isEnabled=false) and it's not an upcoming program.
      return hasDeadlinePassed || (!isEnabled && !isUpcoming);
    case "upcoming":
      return isUpcoming;
    case "active":
      // A program is only "active" if it's within its date range AND accepting
      // applications (isEnabled). Programs with closed applications should not
      // appear in the active list.
      return !hasDeadlinePassed && !isUpcoming && isEnabled;
    default:
      return true;
  }
}

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
    queryKey: ["wl-programs", communityId],
    queryFn: async () => {
      const limit = filters.limit || 20;
      const [res, err] = await fetchData<FundingProgram[]>(
        `/v2/funding-program-configs/community/${communityId}`,
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
