"use client";

import { useQuery } from "@tanstack/react-query";
import { PRERENDER_SAFE_STALE_TIME } from "@/utilities/queries/prerenderStaleTime";
import { fundingProgramsKeys } from "../constants/query-keys";
import { fundingProgramsService } from "../services/funding-programs.service";
import type { FetchFundingProgramsParams } from "../types/funding-program";

// Note: fundingProgramsKeys lives in ../constants/query-keys so the
// /funding-map server component can build the same key when prefetching
// the default list for hydration.

/**
 * Hook to fetch paginated funding programs with filters
 */
export function useFundingPrograms(params: FetchFundingProgramsParams = {}) {
  return useQuery({
    queryKey: fundingProgramsKeys.list(params),
    queryFn: () => fundingProgramsService.getAll(params),
    // Every consumer of this hook renders above the crawlable content of a
    // Cache-class route, where DEV-612 forbids the Suspense boundary Next would
    // otherwise want. See PRERENDER_SAFE_STALE_TIME for the React Query code
    // path and the refetch trade-off.
    staleTime: PRERENDER_SAFE_STALE_TIME,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single funding program by ID
 */
export function useFundingProgram(programId: string | null) {
  return useQuery({
    queryKey: fundingProgramsKeys.detail(programId || ""),
    queryFn: () => fundingProgramsService.getById(programId!),
    enabled: Boolean(programId),
    // Every consumer of this hook renders above the crawlable content of a
    // Cache-class route, where DEV-612 forbids the Suspense boundary Next would
    // otherwise want. See PRERENDER_SAFE_STALE_TIME for the React Query code
    // path and the refetch trade-off.
    staleTime: PRERENDER_SAFE_STALE_TIME,
  });
}

/**
 * Hook to fetch a program by ID
 * Supports both "programId" (preferred) and legacy "programId_chainId" formats
 * Automatically normalizes the input to extract just the programId
 */
export function useFundingProgramByCompositeId(compositeId: string | null) {
  const parsed = compositeId ? fundingProgramsService.parseProgramIdAndChainId(compositeId) : null;

  return useQuery({
    queryKey: fundingProgramsKeys.detail(parsed?.programId || ""),
    queryFn: () => fundingProgramsService.getById(parsed!.programId),
    enabled: Boolean(parsed),
    // Every consumer of this hook renders above the crawlable content of a
    // Cache-class route, where DEV-612 forbids the Suspense boundary Next would
    // otherwise want. See PRERENDER_SAFE_STALE_TIME for the React Query code
    // path and the refetch trade-off.
    staleTime: PRERENDER_SAFE_STALE_TIME,
  });
}

/**
 * Hook to fetch opportunity type counts for the type tabs
 */
export function useTypeCounts(options?: { onlyOnKarma?: boolean }) {
  return useQuery({
    queryKey: fundingProgramsKeys.typeCounts(options),
    queryFn: () => fundingProgramsService.getTypeCounts(options),
    // Every consumer of this hook renders above the crawlable content of a
    // Cache-class route, where DEV-612 forbids the Suspense boundary Next would
    // otherwise want. See PRERENDER_SAFE_STALE_TIME for the React Query code
    // path and the refetch trade-off.
    staleTime: PRERENDER_SAFE_STALE_TIME,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch organization/community filters for the funding map dropdown
 * Returns a list of organizations and communities that have programs
 */
export function useOrganizationFilters() {
  return useQuery({
    queryKey: fundingProgramsKeys.organizationFilters(),
    queryFn: () => fundingProgramsService.getOrganizationFilters(),
    staleTime: 10 * 60 * 1000, // 10 minutes - filters don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
