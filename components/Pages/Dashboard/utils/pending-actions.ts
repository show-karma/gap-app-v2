import type { ProjectWithGrantsResponse } from "@/types/v2/project";

export interface PendingActions {
  milestonesNeedingSubmission: number;
  grantsInProgress: number;
}

export function computeProjectPendingActions(project: ProjectWithGrantsResponse): PendingActions {
  let milestonesNeedingSubmission = 0;
  let grantsInProgress = 0;

  const grants = project.grants ?? [];

  for (const grant of grants) {
    if (!grant.completed) {
      grantsInProgress += 1;
      const milestones = grant.milestones ?? [];
      for (const milestone of milestones) {
        if (!milestone.completed) {
          milestonesNeedingSubmission += 1;
        }
      }
    }
  }

  return {
    milestonesNeedingSubmission,
    grantsInProgress,
  };
}
