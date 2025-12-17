"use client";

import { useQuery } from "@tanstack/react-query";
import { FUNDING_MAP_DEFAULT_CHAIN_ID } from "../constants/filter-options";
import { fundingProgramsService } from "../services/funding-programs.service";
import type { FetchFundingProgramsParams } from "../types/funding-program";

/**
 * Query key factory for funding programs
 * Enables proper cache management and invalidation
 */
export const fundingProgramsKeys = {
  all: ["fundingPrograms"] as const,
  lists: () => [...fundingProgramsKeys.all, "list"] as const,
  list: (params: FetchFundingProgramsParams) => [...fundingProgramsKeys.lists(), params] as const,
  details: () => [...fundingProgramsKeys.all, "detail"] as const,
  detail: (programId: string, chainId: number) =>
    [...fundingProgramsKeys.details(), programId, chainId] as const,
  organizationFilters: () => [...fundingProgramsKeys.all, "organizationFilters"] as const,
};

/**
 * Hook to fetch paginated funding programs with filters
 */
export function useFundingPrograms(params: FetchFundingProgramsParams = {}) {
  return useQuery({
    queryKey: fundingProgramsKeys.list(params),
    queryFn: () => fundingProgramsService.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection time)
  });
}

/**
 * Hook to fetch a single funding program by ID
 */
export function useFundingProgram(
  programId: string | null,
  chainId: number = FUNDING_MAP_DEFAULT_CHAIN_ID
) {
  return useQuery({
    queryKey: fundingProgramsKeys.detail(programId || "", chainId),
    queryFn: () => fundingProgramsService.getById(programId!, chainId),
    enabled: Boolean(programId),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch a program by composite ID (programId_chainId format)
 */
export function useFundingProgramByCompositeId(compositeId: string | null) {
  const parsed = compositeId ? fundingProgramsService.parseProgramIdAndChainId(compositeId) : null;

  return useQuery({
    queryKey: fundingProgramsKeys.detail(
      parsed?.programId || "",
      parsed?.chainId || FUNDING_MAP_DEFAULT_CHAIN_ID
    ),
    queryFn: () => fundingProgramsService.getById(parsed!.programId, parsed!.chainId),
    enabled: Boolean(parsed),
    staleTime: 5 * 60 * 1000,
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
