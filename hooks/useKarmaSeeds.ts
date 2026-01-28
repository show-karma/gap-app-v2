"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { errorManager } from "@/components/Utilities/errorManager";
import type {
  CreateKarmaSeedsRequest,
  KarmaSeeds,
  KarmaSeedsExistsResponse,
  KarmaSeedsStats,
  PreviewBuyResponse,
  TotalRaisedResponse,
} from "@/types/karmaSeeds";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Query key factory for Karma Seeds
 */
export const KARMA_SEEDS_QUERY_KEYS = {
  all: ["karmaSeeds"] as const,
  byProject: (projectUID: string) => [...KARMA_SEEDS_QUERY_KEYS.all, projectUID] as const,
  totalRaised: (projectUID: string) =>
    [...KARMA_SEEDS_QUERY_KEYS.all, "totalRaised", projectUID] as const,
  exists: (projectUID: string) => [...KARMA_SEEDS_QUERY_KEYS.all, "exists", projectUID] as const,
  stats: (projectUID: string) => [...KARMA_SEEDS_QUERY_KEYS.all, "stats", projectUID] as const,
  preview: (projectUID: string, paymentToken: string, amount: string) =>
    [...KARMA_SEEDS_QUERY_KEYS.all, "preview", projectUID, paymentToken, amount] as const,
};

/**
 * Fetch Karma Seeds for a project
 */
async function fetchKarmaSeeds(projectUID: string): Promise<KarmaSeeds | null> {
  const [data, error] = await fetchData<KarmaSeeds>(
    INDEXER.KARMA_SEEDS.GET(projectUID),
    "GET",
    {},
    {},
    {},
    false // Public endpoint, no auth required
  );

  if (error) {
    // 404 means no Karma Seeds for this project (expected case)
    if (error.includes("not found") || error.includes("404")) {
      return null;
    }
    throw new Error(error);
  }

  return data;
}

/**
 * Check if Karma Seeds exists for a project
 */
async function checkKarmaSeedsExists(projectUID: string): Promise<boolean> {
  const [data, error] = await fetchData<KarmaSeedsExistsResponse>(
    INDEXER.KARMA_SEEDS.EXISTS(projectUID),
    "GET",
    {},
    {},
    {},
    false
  );

  if (error) {
    console.error("Error checking Karma Seeds existence:", error);
    return false;
  }

  return data?.exists ?? false;
}

/**
 * Fetch total raised amount for a project
 */
async function fetchTotalRaised(projectUID: string): Promise<TotalRaisedResponse | null> {
  const [data, error] = await fetchData<TotalRaisedResponse>(
    INDEXER.KARMA_SEEDS.TOTAL_RAISED(projectUID),
    "GET",
    {},
    {},
    {},
    false
  );

  if (error) {
    if (error.includes("not found") || error.includes("404")) {
      return null;
    }
    throw new Error(error);
  }

  return data;
}

/**
 * Fetch live contract stats from blockchain
 */
async function fetchKarmaSeedsStats(projectUID: string): Promise<KarmaSeedsStats | null> {
  const [data, error] = await fetchData<KarmaSeedsStats>(
    INDEXER.KARMA_SEEDS.STATS(projectUID),
    "GET",
    {},
    {},
    {},
    false
  );

  if (error) {
    if (error.includes("not found") || error.includes("404")) {
      return null;
    }
    throw new Error(error);
  }

  return data;
}

/**
 * Fetch preview buy calculation
 */
async function fetchPreviewBuy(
  projectUID: string,
  paymentToken: string,
  amount: string,
  decimals?: number
): Promise<PreviewBuyResponse | null> {
  const [data, error] = await fetchData<PreviewBuyResponse>(
    INDEXER.KARMA_SEEDS.PREVIEW(projectUID, paymentToken, amount, decimals),
    "GET",
    {},
    {},
    {},
    false
  );

  if (error) {
    if (error.includes("not found") || error.includes("404")) {
      return null;
    }
    throw new Error(error);
  }

  return data;
}

/**
 * Create Karma Seeds record (after contract deployment)
 */
async function createKarmaSeeds(
  projectUID: string,
  request: CreateKarmaSeedsRequest
): Promise<KarmaSeeds> {
  const [data, error] = await fetchData<KarmaSeeds>(
    INDEXER.KARMA_SEEDS.CREATE(projectUID),
    "POST",
    request,
    {},
    {},
    true // Requires authentication
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Failed to create Karma Seeds record");
  }

  return data;
}

/**
 * Hook to fetch Karma Seeds for a project
 */
export function useKarmaSeeds(projectUID: string | undefined) {
  return useQuery({
    queryKey: KARMA_SEEDS_QUERY_KEYS.byProject(projectUID || ""),
    queryFn: () => fetchKarmaSeeds(projectUID!),
    enabled: !!projectUID,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to check if Karma Seeds exists for a project
 */
export function useKarmaSeedsExists(projectUID: string | undefined) {
  return useQuery({
    queryKey: KARMA_SEEDS_QUERY_KEYS.exists(projectUID || ""),
    queryFn: () => checkKarmaSeedsExists(projectUID!),
    enabled: !!projectUID,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Hook to fetch total raised amount (with auto-refresh)
 */
export function useTotalRaised(projectUID: string | undefined, enabled = true) {
  return useQuery({
    queryKey: KARMA_SEEDS_QUERY_KEYS.totalRaised(projectUID || ""),
    queryFn: () => fetchTotalRaised(projectUID!),
    enabled: !!projectUID && enabled,
    staleTime: 30 * 1000, // 30 seconds (refresh more frequently)
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    retry: 1,
  });
}

/**
 * Hook to fetch live contract stats from blockchain
 */
export function useKarmaSeedsStats(projectUID: string | undefined, enabled = true) {
  return useQuery({
    queryKey: KARMA_SEEDS_QUERY_KEYS.stats(projectUID || ""),
    queryFn: () => fetchKarmaSeedsStats(projectUID!),
    enabled: !!projectUID && enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    retry: 1,
  });
}

/**
 * Hook to preview buy calculation
 */
export function usePreviewBuy(
  projectUID: string | undefined,
  paymentToken: string | undefined,
  amount: string | undefined,
  decimals?: number,
  enabled = true
) {
  return useQuery({
    queryKey: KARMA_SEEDS_QUERY_KEYS.preview(projectUID || "", paymentToken || "", amount || ""),
    queryFn: () => fetchPreviewBuy(projectUID!, paymentToken!, amount!, decimals),
    enabled: !!projectUID && !!paymentToken && !!amount && parseFloat(amount) > 0 && enabled,
    staleTime: 10 * 1000, // 10 seconds (prices can change)
    retry: 1,
  });
}

/**
 * Hook to create Karma Seeds record
 */
export function useCreateKarmaSeeds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectUID,
      request,
    }: {
      projectUID: string;
      request: CreateKarmaSeedsRequest;
    }) => createKarmaSeeds(projectUID, request),
    onSuccess: (data, variables) => {
      // Invalidate and refetch queries
      queryClient.invalidateQueries({
        queryKey: KARMA_SEEDS_QUERY_KEYS.byProject(variables.projectUID),
      });
      queryClient.invalidateQueries({
        queryKey: KARMA_SEEDS_QUERY_KEYS.exists(variables.projectUID),
      });
      queryClient.invalidateQueries({
        queryKey: KARMA_SEEDS_QUERY_KEYS.totalRaised(variables.projectUID),
      });
    },
    onError: (error: Error) => {
      errorManager("Error creating Karma Seeds", error);
    },
  });
}

export type {
  KarmaSeeds,
  TotalRaisedResponse,
  CreateKarmaSeedsRequest,
  KarmaSeedsStats,
  PreviewBuyResponse,
};
