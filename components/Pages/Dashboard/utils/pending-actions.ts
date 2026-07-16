import type { ProjectWithGrantsResponse } from "@/types/v2/project";
import { PAGES } from "@/utilities/pages";

interface PendingActions {
  milestonesNeedingSubmission: number;
  grantsInProgress: number;
  /** uids of incomplete grants that have ≥1 milestone still needing submission. */
  grantsWithPendingMilestones: string[];
  /** uids of every incomplete grant. */
  inProgressGrantUids: string[];
}

export function computeProjectPendingActions(project: ProjectWithGrantsResponse): PendingActions {
  let milestonesNeedingSubmission = 0;
  let grantsInProgress = 0;
  // Uid lists power the single-grant deep-link, so they only collect grants that
  // actually carry a uid — the counts above stay independent of that.
  const grantsWithPendingMilestones: string[] = [];
  const inProgressGrantUids: string[] = [];

  for (const grant of project.grants ?? []) {
    if (grant.completed) continue;
    grantsInProgress += 1;
    if (grant.uid) inProgressGrantUids.push(grant.uid);

    let grantHasPendingMilestone = false;
    for (const milestone of grant.milestones ?? []) {
      if (!milestone.completed) {
        milestonesNeedingSubmission += 1;
        grantHasPendingMilestone = true;
      }
    }
    if (grantHasPendingMilestone && grant.uid) grantsWithPendingMilestones.push(grant.uid);
  }

  return {
    milestonesNeedingSubmission,
    grantsInProgress,
    grantsWithPendingMilestones,
    inProgressGrantUids,
  };
}

/**
 * Where to send someone who clicks a project's pending-work badge: the specific
 * grant when the work concentrates in a SINGLE grant (so they land on that
 * grant's page), otherwise the project's funding tab (all grants). Falls back to
 * the project overview when there is no pending work.
 */
export function projectPendingHref(slug: string, actions: PendingActions): string {
  if (actions.milestonesNeedingSubmission > 0) {
    // Land on the grant's milestones tab, anchored to the pending section.
    return actions.grantsWithPendingMilestones.length === 1
      ? `${PAGES.PROJECT.MILESTONES_AND_UPDATES(slug, actions.grantsWithPendingMilestones[0])}#pending`
      : PAGES.PROJECT.GRANTS(slug);
  }
  if (actions.grantsInProgress > 0) {
    return actions.inProgressGrantUids.length === 1
      ? PAGES.PROJECT.GRANT(slug, actions.inProgressGrantUids[0])
      : PAGES.PROJECT.GRANTS(slug);
  }
  return PAGES.PROJECT.OVERVIEW(slug);
}
