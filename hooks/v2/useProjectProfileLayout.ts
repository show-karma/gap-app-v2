/**
 * useProjectProfileLayout Hook
 *
 * Lightweight hook for the project profile layout. Only fetches core project
 * data and grants (for stats bar counts and verification status). Does NOT
 * fetch updates or impacts — those are deferred to per-tab hooks.
 *
 * This avoids loading heavy update/impact data on every tab, since only the
 * Updates tab needs the full activity feed.
 */

import { useMemo } from "react";
import { useProject } from "@/hooks/useProject";
import { determineProjectVerification } from "@/services/project-profile.service";
import type { Project } from "@/types/v2/project";
import type { ProjectProfileStats } from "@/types/v2/project-profile.types";
import { useProjectGrants } from "./useProjectGrants";

export interface UseProjectProfileLayoutResult {
  /** The project data */
  project: Project | null;
  /** Whether only the core project data is still loading (fast path for LCP) */
  isProjectLoading: boolean;
  /** Whether any layout data is still loading */
  isLoading: boolean;
  /** Whether the project fetch failed (e.g., not found) */
  isError: boolean;
  /** Whether the project has grants (verification indicator) */
  isVerified: boolean;
  /** Stats for the stats bar (grantsCount, endorsementsCount) */
  stats: ProjectProfileStats;
}

/**
 * Hook for layout-level project data. Fetches only project core + grants.
 * Updates and impacts are deferred to per-tab hooks.
 *
 * @param projectId - The project UID or slug
 */
export function useProjectProfileLayout(projectId: string): UseProjectProfileLayoutResult {
  const { project, isLoading: isProjectLoading, isError } = useProject(projectId);

  const { grants, isLoading: isGrantsLoading } = useProjectGrants(project?.uid || projectId);

  const normalizedProject = project ?? null;
  const isLoading = isProjectLoading || isGrantsLoading;

  const isVerified = useMemo(() => determineProjectVerification(grants), [grants]);

  const stats = useMemo((): ProjectProfileStats => {
    const endorsements = normalizedProject?.endorsements || [];
    const uniqueEndorsers = new Set(
      endorsements.map((e: { endorsedBy: string }) => e.endorsedBy?.toLowerCase())
    );

    return {
      grantsCount: grants.length,
      endorsementsCount: uniqueEndorsers.size,
      // lastUpdate is not available without fetching updates — layout shows
      // the stat only when it's provided, so undefined is fine here.
      lastUpdate: undefined,
    };
  }, [normalizedProject, grants]);

  return {
    project: normalizedProject,
    isProjectLoading,
    isLoading,
    isError,
    isVerified,
    stats,
  };
}
