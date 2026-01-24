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
import type { ProjectProfileData, ProjectProfileState } from "@/types/v2/project-profile.types";
import { useProjectGrants } from "./useProjectGrants";
import { useProjectImpacts } from "./useProjectImpacts";
import { useProjectUpdates } from "./useProjectUpdates";

/**
 * Return type for useProjectProfile hook.
 */
export interface UseProjectProfileResult extends ProjectProfileData, ProjectProfileState {
  /** The project data */
  project: Project | null;
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
 * @returns Aggregated project profile data with loading/error states
 */
export function useProjectProfile(projectId: string): UseProjectProfileResult {
  // Fetch core project data
  const { project, isLoading: isProjectLoading } = useProject(projectId);

  // Fetch grants using project UID or fallback to projectId
  const {
    grants,
    isLoading: isGrantsLoading,
    refetch: refetchGrants,
  } = useProjectGrants(project?.uid || projectId);

  // Fetch updates and milestones
  const {
    milestones = [],
    isLoading: isUpdatesLoading,
    refetch: refetchUpdates,
  } = useProjectUpdates(projectId);

  // Fetch impacts
  const {
    impacts = [],
    isLoading: isImpactsLoading,
    refetch: refetchImpacts,
  } = useProjectImpacts(projectId);

  // Aggregate loading state
  const isLoading = isProjectLoading || isGrantsLoading || isUpdatesLoading || isImpactsLoading;

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
    error: null,
    refetch,
    ...profileData,
  };
}
