/**
 * useUpdatesTabData Hook
 *
 * Fetches and aggregates data needed specifically for the Updates tab:
 * milestones, impacts, and grants (for "Grant Received" activity items).
 *
 * This replaces the full useProjectProfile call in UpdatesContent,
 * avoiding redundant project-core fetching (already done by the layout).
 */

import { useMemo } from "react";
import {
  combineUpdatesAndImpacts,
  countActualMilestones,
  countCompletedMilestones,
} from "@/services/project-profile.service";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { useProjectGrants } from "./useProjectGrants";
import { useProjectImpacts } from "./useProjectImpacts";
import { useProjectUpdates } from "./useProjectUpdates";

export interface UseUpdatesTabDataResult {
  allUpdates: UnifiedMilestone[];
  milestonesCount: number;
  completedCount: number;
  isLoading: boolean;
}

/**
 * Hook for the Updates tab. Fetches updates, impacts, and grants,
 * then combines them into a unified activity feed.
 *
 * @param projectId - The project UID or slug
 */
export function useUpdatesTabData(projectId: string): UseUpdatesTabDataResult {
  const { milestones = [], isLoading: isUpdatesLoading } = useProjectUpdates(projectId);

  const { impacts = [], isLoading: isImpactsLoading } = useProjectImpacts(projectId);

  const { grants, isLoading: isGrantsLoading } = useProjectGrants(projectId);

  const isLoading = isUpdatesLoading || isImpactsLoading || isGrantsLoading;

  const allUpdates = useMemo(
    () => combineUpdatesAndImpacts(milestones, impacts, grants),
    [milestones, impacts, grants]
  );

  const milestonesCount = useMemo(() => countActualMilestones(allUpdates), [allUpdates]);

  const completedCount = useMemo(() => countCompletedMilestones(allUpdates), [allUpdates]);

  return {
    allUpdates,
    milestonesCount,
    completedCount,
    isLoading,
  };
}
