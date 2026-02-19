"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import { getProgramFinancials } from "@/services/financialsService";
import type { ProgramFinancialsResponse } from "@/types/financials";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Hook for managing the selected program ID in URL state
 * Uses nuqs for URL persistence - enables shareable links and back button support
 */
export function useSelectedProgram() {
  return useQueryState(
    "programId",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );
}

/**
 * Hook for fetching program financials with infinite scroll pagination
 *
 * @param programId - The program ID to fetch financials for (null if no program selected)
 * @param options - Optional configuration
 * @returns React Query infinite query result with program financials
 */
export function useProgramFinancials(
  programId: string | null,
  options?: {
    enabled?: boolean;
    limit?: number;
  }
) {
  const limit = options?.limit ?? 10;

  return useInfiniteQuery<ProgramFinancialsResponse, Error>({
    queryKey: QUERY_KEYS.FINANCIALS.PROGRAM(programId ?? ""),
    queryFn: async ({ pageParam }) => {
      if (!programId) {
        throw new Error("Program ID is required");
      }
      return getProgramFinancials(programId, pageParam as number, limit);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage.pagination.hasPrevPage ? firstPage.pagination.page - 1 : undefined,
    enabled: options?.enabled !== false && !!programId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for fetching program financials summary only (first page)
 * Use this when you only need the summary data without infinite scroll
 *
 * @param programId - The program ID to fetch financials for
 * @param options - Optional configuration
 * @returns React Query result with program financials summary
 */
export function useProgramFinancialsSummary(
  programId: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery<ProgramFinancialsResponse, Error>({
    queryKey: [...QUERY_KEYS.FINANCIALS.PROGRAM(programId ?? ""), "summary"],
    queryFn: () => {
      if (!programId) {
        throw new Error("Program ID is required");
      }
      return getProgramFinancials(programId, 1, 1);
    },
    enabled: options?.enabled !== false && !!programId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
