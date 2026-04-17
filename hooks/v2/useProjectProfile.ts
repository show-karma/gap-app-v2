/**
 * useProjectProfile Hook
 *
 * Unified hook that encapsulates all project profile data fetching
 * and transformation. Follows DDD patterns by aggregating multiple
 * data sources into a single, cohesive interface.
 */

import { useMemo } from "react";
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
export function useProjectProfile(
  projectId: string,
  milestoneStatus?: "pending" | "completed" | "verified",
  filters?: UpdatesFeedFilters
): UseProjectProfileResult {
  // Fetch core project data
  const { project, isLoading: isProjectLoading, isError, error } = useProject(projectId);

  // Fetch grants using project UID or fallback to projectId
  const {
    grants,
    isLoading: isGrantsLoading,
    refetch: refetchGrants,
  } = useProjectGrants(project?.uid || projectId);

  // Fetch updates and milestones (pass milestoneStatus and extra filters for server-side filtering)
  const {
    milestones = [],
    isLoading: isUpdatesLoading,
    isFetching: isUpdatesFetching,
    refetch: refetchUpdates,
  } = useProjectUpdates(projectId, milestoneStatus, filters);

  // Fetch impacts
  const {
    impacts = [],
    isLoading: isImpactsLoading,
    refetch: refetchImpacts,
  } = useProjectImpacts(projectId);

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

  // Combined refetch function
  const refetch = async () => {
    await Promise.all([refetchGrants(), refetchUpdates(), refetchImpacts()]);
  };

  return {
    project: normalizedProject,
    isLoading,
    isProjectLoading,
    isSecondaryLoading,
    isUpdating: isUpdatesFetching,
    isError,
    error: error instanceof Error ? error : error ? new Error(String(error)) : null,
    refetch,
    ...profileData,
  };
}
