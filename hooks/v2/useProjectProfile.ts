/**
 * useProjectProfile Hook
 *
 * Unified hook that encapsulates all project profile data fetching
 * and transformation. Follows DDD patterns by aggregating multiple
 * data sources into a single, cohesive interface.
 */

import { useCallback, useMemo } from "react";
import { useProject } from "@/hooks/useProject";
import { aggregateProjectProfileData } from "@/services/project-profile.service";
import type { Project } from "@/types/v2/project";
import type {
  ProjectProfileData,
  ProjectProfileState,
  UpdatesFeedFilters,
} from "@/types/v2/project-profile.types";
import { useProjectGrants } from "./useProjectGrants";
import { useProjectImpacts } from "./useProjectImpacts";
import { useProjectUpdates } from "./useProjectUpdates";

/**
 * Return type for useProjectProfile hook.
 */
export interface UseProjectProfileResult extends ProjectProfileData, ProjectProfileState {
  /** The project data */
  project: Project | null;
  /** Whether the project fetch failed (e.g., not found) */
  isError: boolean;
  /** Whether the updates/milestones fetch failed — drives the feed's error state */
  isUpdatesError: boolean;
  /** Whether the updates query has returned, even if it returned zero items */
  hasUpdatesData: boolean;
  /** Whether the updates/milestones are being re-fetched (e.g., during filter change) */
  isUpdating: boolean;
  /** Refetch all project data */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and aggregate all project profile data.
 *
 * This hook combines data from multiple sources:
 * - useProject: Core project data
 * - useProjectGrants: Project grants
 * - useProjectUpdates: Milestones and updates
 * - useProjectImpacts: Project impacts
 *
 * It then uses the project-profile.service to transform and aggregate
 * all data into a unified format for the ProjectProfilePage.
 *
 * @param projectId - The project UID or slug
 * @param milestoneStatus - Optional milestone lifecycle filter
 * @param filters - Optional extra filters forwarded to the indexer
 * @returns Aggregated project profile data with loading/error states
 */
interface UseProjectProfileOptions {
  /** Opt into clock-free staleTime; see PRERENDER_SAFE_STALE_TIME. */
  prerenderSafe?: boolean;
  /**
   * Whether secondary data fetches (grants/updates/impacts) should attach
   * a Privy bearer token. Defaults to `true`. Public profile callers MUST
   * pass `false` to keep anonymous traffic off the auth-required path.
   */
  isAuthorized?: boolean;
}

export function useProjectProfile(
  projectId: string,
  milestoneStatus?: "pending" | "completed" | "verified",
  filters?: UpdatesFeedFilters,
  options: UseProjectProfileOptions = {}
): UseProjectProfileResult {
  const { isAuthorized = true, prerenderSafe = false } = options;

  // Fetch core project data
  const {
    project,
    isLoading: isProjectLoading,
    isError,
    error,
  } = useProject(projectId, { prerenderSafe });

  // Fetch grants using project UID or fallback to projectId
  const {
    grants,
    isLoading: isGrantsLoading,
    refetch: refetchGrants,
  } = useProjectGrants(project?.uid || projectId, { isAuthorized, prerenderSafe });

  // Fetch updates and milestones (pass milestoneStatus and extra filters for server-side filtering)
  const {
    milestones = [],
    rawData: updatesRawData,
    isLoading: isUpdatesLoading,
    isFetching: isUpdatesFetching,
    error: updatesError,
    refetch: refetchUpdates,
  } = useProjectUpdates(projectId, milestoneStatus, filters, { isAuthorized, prerenderSafe });

  // Fetch impacts
  const {
    impacts = [],
    isLoading: isImpactsLoading,
    refetch: refetchImpacts,
  } = useProjectImpacts(projectId, { isAuthorized });

  // Split loading states: core project vs secondary data
  const isSecondaryLoading = isGrantsLoading || isUpdatesLoading || isImpactsLoading;
  const isLoading = isProjectLoading || isSecondaryLoading;

  // Normalize undefined to null for consistent typing
  const normalizedProject = project ?? null;

  // Aggregate all data using the service layer
  const profileData = useMemo(
    (): ProjectProfileData =>
      aggregateProjectProfileData(normalizedProject, grants, milestones, impacts),
    [normalizedProject, grants, milestones, impacts]
  );

  // Combined refetch function. Memoized so its identity is stable across
  // renders — consumers wire this into onClick/effects and an unstable identity
  // would re-trigger them (DEV-396).
  const refetch = useCallback(async () => {
    await Promise.all([refetchGrants(), refetchUpdates(), refetchImpacts()]);
  }, [refetchGrants, refetchUpdates, refetchImpacts]);

  return {
    project: normalizedProject,
    isLoading,
    isProjectLoading,
    isSecondaryLoading,
    isUpdating: isUpdatesFetching,
    isError,
    error: error instanceof Error ? error : error ? new Error(String(error)) : null,
    // Surfaced separately from the core-project `isError` above: the updates
    // query is what the Updates tab renders, and a failure there has to reach
    // the feed as an error state rather than being indistinguishable from
    // "still loading" (which rendered a skeleton forever).
    isUpdatesError: Boolean(updatesError),
    // Whether the updates query has returned, regardless of how many items it
    // produced. Callers must not infer this from item count: a filtered query
    // can succeed with zero results, and treating that as "no data yet" keeps a
    // stale unfiltered server feed on screen instead of the empty result.
    hasUpdatesData: updatesRawData !== undefined,
    refetch,
    ...profileData,
  };
}
