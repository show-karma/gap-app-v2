"use client";

import { useQuery } from "@tanstack/react-query";
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
  detail: (programId: string) => [...fundingProgramsKeys.details(), programId] as const,
  organizationFilters: () => [...fundingProgramsKeys.all, "organizationFilters"] as const,
};

/**
 * Hook to fetch paginated funding programs with filters
 */
export function useFundingPrograms(params: FetchFundingProgramsParams = {}) {
  return useQuery({
    queryKey: fundingProgramsKeys.list(params),
    queryFn: () => fundingProgramsService.getAll(params),
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
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
