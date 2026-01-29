import type { QueryClient } from "@tanstack/react-query";
import { cache } from "react";
import { getProjectGrants } from "@/services/project-grants.service";
import { getProjectImpacts } from "@/services/project-impacts.service";
import { getProjectUpdates } from "@/services/project-updates.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Result of a prefetch operation indicating success or failure
 */
export interface PrefetchResult {
  grants: boolean;
  updates: boolean;
  impacts: boolean;
}

/**
 * Prefetch all project profile data in parallel on the server.
 *
 * Uses React.cache() for request deduplication within the same request.
 * This function should be called in Server Components to prefetch data
 * that will be consumed by client components via React Query.
 *
 * Uses Promise.allSettled to ensure all prefetches are attempted even if some fail.
 * Failed prefetches are logged but don't break the page - client-side hooks will
 * fetch the data as a fallback.
 *
 * @param queryClient - The QueryClient instance to prefetch into
 * @param projectId - The project UID or slug
 * @returns PrefetchResult indicating which queries succeeded
 */
export const prefetchProjectProfileData = cache(
  async (queryClient: QueryClient, projectId: string): Promise<PrefetchResult> => {
    const results = await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.PROJECT.GRANTS(projectId),
        queryFn: () => getProjectGrants(projectId),
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.PROJECT.UPDATES(projectId),
        queryFn: () => getProjectUpdates(projectId),
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.PROJECT.IMPACTS(projectId),
        queryFn: () => getProjectImpacts(projectId),
        staleTime: 5 * 60 * 1000,
      }),
    ]);

    // Log failures in development for debugging
    if (process.env.NODE_ENV === "development") {
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const queryNames = ["grants", "updates", "impacts"];
          console.warn(
            `[prefetchProjectProfileData] Failed to prefetch ${queryNames[index]} for project ${projectId}:`,
            result.reason
          );
        }
      });
    }

    return {
      grants: results[0].status === "fulfilled",
      updates: results[1].status === "fulfilled",
      impacts: results[2].status === "fulfilled",
    };
  }
);

/**
 * Get cached project grants data for server-side use.
 * Uses React.cache() for request deduplication.
 */
export const getProjectGrantsCached = cache(async (projectId: string) => {
  return getProjectGrants(projectId);
});

/**
 * Get cached project updates data for server-side use.
 * Uses React.cache() for request deduplication.
 */
export const getProjectUpdatesCached = cache(async (projectId: string) => {
  return getProjectUpdates(projectId);
});

/**
 * Get cached project impacts data for server-side use.
 * Uses React.cache() for request deduplication.
 */
export const getProjectImpactsCached = cache(async (projectId: string) => {
  return getProjectImpacts(projectId);
});
