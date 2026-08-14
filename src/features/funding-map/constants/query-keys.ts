import type { FetchFundingProgramsParams } from "../types/funding-program";
import { FUNDING_MAP_PAGE_SIZE } from "./filter-options";

/**
 * Query key factory for funding programs. Lives outside the `"use client"`
 * hook module so the /funding-map server component can build the exact same
 * key when prefetching the default program list for hydration.
 */
export const fundingProgramsKeys = {
  all: ["fundingPrograms"] as const,
  lists: () => [...fundingProgramsKeys.all, "list"] as const,
  list: (params: FetchFundingProgramsParams) => [...fundingProgramsKeys.lists(), params] as const,
  details: () => [...fundingProgramsKeys.all, "detail"] as const,
  detail: (programId: string) => [...fundingProgramsKeys.details(), programId] as const,
  organizationFilters: () => [...fundingProgramsKeys.all, "organizationFilters"] as const,
  typeCounts: (options?: { onlyOnKarma?: boolean }) =>
    [...fundingProgramsKeys.all, "typeCounts", options] as const,
};

/**
 * The params `useFundingFilters` produces when no URL filter is set (page 1,
 * default page size, "Active" status). The server prefetch must use exactly
 * these so its query key hashes identically to the client's first render —
 * React Query drops `undefined` values when hashing, so the omitted optional
 * fields still match.
 */
export const DEFAULT_FUNDING_MAP_API_PARAMS: FetchFundingProgramsParams = {
  page: 1,
  pageSize: FUNDING_MAP_PAGE_SIZE,
  status: "Active",
};
