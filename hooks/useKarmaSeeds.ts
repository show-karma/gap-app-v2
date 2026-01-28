"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { errorManager } from "@/components/Utilities/errorManager";
import type {
  CreateKarmaSeedsRequest,
  KarmaSeeds,
  KarmaSeedsStats,
  PreviewBuyResponse,
} from "@/types/karmaSeeds";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Query key factory for Seeds
 */
export const SEEDS_QUERY_KEYS = {
  all: ["seeds"] as const,
  byProject: (projectIdOrSlug: string) => [...SEEDS_QUERY_KEYS.all, projectIdOrSlug] as const,
  stats: (projectIdOrSlug: string) => [...SEEDS_QUERY_KEYS.all, "stats", projectIdOrSlug] as const,
  preview: (projectIdOrSlug: string, paymentToken: string, amount: string) =>
    [...SEEDS_QUERY_KEYS.all, "preview", projectIdOrSlug, paymentToken, amount] as const,
};

/**
 * Fetch Seeds for a project
 */
async function fetchSeeds(projectIdOrSlug: string): Promise<KarmaSeeds | null> {
  const [data, error] = await fetchData<KarmaSeeds>(
    INDEXER.SEEDS.GET(projectIdOrSlug),
    "GET",
    {},
    {},
    {},
    false // Public endpoint, no auth required
  );

  if (error) {
    // 404 means no Seeds for this project (expected case)
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
async function fetchSeedsStats(projectIdOrSlug: string): Promise<KarmaSeedsStats | null> {
  const [data, error] = await fetchData<KarmaSeedsStats>(
    INDEXER.SEEDS.STATS(projectIdOrSlug),
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
  projectIdOrSlug: string,
  paymentToken: string,
  amount: string,
  decimals?: number
): Promise<PreviewBuyResponse | null> {
  const [data, error] = await fetchData<PreviewBuyResponse>(
    INDEXER.SEEDS.PREVIEW(projectIdOrSlug, paymentToken, amount, decimals),
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
 * Create Seeds record (after contract deployment)
 */
async function createSeeds(
  projectIdOrSlug: string,
  request: CreateKarmaSeedsRequest
): Promise<KarmaSeeds> {
  const [data, error] = await fetchData<KarmaSeeds>(
    INDEXER.SEEDS.CREATE(projectIdOrSlug),
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
    throw new Error("Failed to create Seeds record");
  }

  return data;
}

/**
 * Hook to fetch Seeds for a project
 */
export function useKarmaSeeds(projectIdOrSlug: string | undefined) {
  return useQuery({
    queryKey: SEEDS_QUERY_KEYS.byProject(projectIdOrSlug || ""),
    queryFn: () => fetchSeeds(projectIdOrSlug!),
    enabled: !!projectIdOrSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to fetch live contract stats from blockchain
 */
export function useKarmaSeedsStats(projectIdOrSlug: string | undefined, enabled = true) {
  return useQuery({
    queryKey: SEEDS_QUERY_KEYS.stats(projectIdOrSlug || ""),
    queryFn: () => fetchSeedsStats(projectIdOrSlug!),
    enabled: !!projectIdOrSlug && enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    retry: 1,
  });
}

/**
 * Hook to preview buy calculation
 */
export function usePreviewBuy(
  projectIdOrSlug: string | undefined,
  paymentToken: string | undefined,
  amount: string | undefined,
  decimals?: number,
  enabled = true
) {
  return useQuery({
    queryKey: SEEDS_QUERY_KEYS.preview(projectIdOrSlug || "", paymentToken || "", amount || ""),
    queryFn: () => fetchPreviewBuy(projectIdOrSlug!, paymentToken!, amount!, decimals),
    enabled: !!projectIdOrSlug && !!paymentToken && !!amount && parseFloat(amount) > 0 && enabled,
    staleTime: 10 * 1000, // 10 seconds (prices can change)
    retry: 1,
  });
}

/**
 * Hook to create Seeds record
 */
export function useCreateSeeds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectIdOrSlug,
      request,
    }: {
      projectIdOrSlug: string;
      request: CreateKarmaSeedsRequest;
    }) => createSeeds(projectIdOrSlug, request),
    onSuccess: (data, variables) => {
      // Invalidate and refetch queries
      queryClient.invalidateQueries({
        queryKey: SEEDS_QUERY_KEYS.byProject(variables.projectIdOrSlug),
      });
    },
    onError: (error: Error) => {
      errorManager("Error creating Seeds", error);
    },
  });
}

export type { KarmaSeeds, CreateKarmaSeedsRequest, KarmaSeedsStats, PreviewBuyResponse };
