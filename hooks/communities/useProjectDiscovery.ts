import { useMutation } from "@tanstack/react-query";
import {
  type DiscoverProjectsPayload,
  discoverProjects,
  type ProjectDiscoveryResult,
} from "@/services/projectDiscovery";

/**
 * Mutation hook for the community project-discovery search.
 *
 * Errors are reported in the service layer (via `errorManager`) and surfaced
 * to the UI through `mutation.isError` — no direct console logging here.
 *
 * @param communityId - The community UID or slug to search within.
 *
 * @example
 * ```tsx
 * const discovery = useProjectDiscovery(communityId);
 * discovery.mutate({ programId, categoryId, endorsers, indicatorDistribution });
 * // discovery.data === undefined -> not searched yet
 * // discovery.data === []        -> searched, nothing matched
 * // discovery.isError            -> search failed, offer retry
 * ```
 */
export const useProjectDiscovery = (communityId: string) =>
  useMutation<ProjectDiscoveryResult[], Error, DiscoverProjectsPayload>({
    mutationFn: (payload) => discoverProjects(communityId, payload),
  });
