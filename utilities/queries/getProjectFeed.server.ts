import { cache } from "react";
import { convertToUnifiedMilestones } from "@/hooks/v2/useProjectUpdates";
import { getProjectGrants } from "@/services/project-grants.service";
import { getProjectImpacts } from "@/services/project-impacts.service";
import { aggregateProjectProfileData } from "@/services/project-profile.service";
import { getProjectUpdates } from "@/services/project-updates.service";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

// Upper bound on items rendered into the server HTML. The interactive client
// feed loads the full list and replaces this on hydration; the cap just keeps
// the initial HTML payload reasonable — the most recent items already carry the
// indexable titles/descriptions crawlers need.
export const SERVER_FEED_MAX_ITEMS = 50;

/**
 * Server-only: builds a project's unified activity feed using the exact same
 * services + transform + aggregation as the client `useProjectProfile` hook, so
 * the server-rendered twin (ActivityFeedStatic) shows the same items the
 * interactive client feed will. Fetches the anonymous/public view — which is
 * precisely what crawlers see — and never throws: the feed is supplementary SSR
 * content, so any failure degrades to an empty list rather than breaking the
 * page.
 *
 * `cache()`-wrapped for per-request dedup; the project route is ISR
 * (`revalidate = 60`), so this runs at most once per project per revalidation
 * window rather than on every request.
 */
export const getProjectFeed = cache(async (projectId: string): Promise<UnifiedMilestone[]> => {
  try {
    const project = await getProjectCachedData(projectId);
    if (!project) return [];

    const [grants, updates, impacts] = await Promise.all([
      getProjectGrants(project.uid || projectId).catch(() => []),
      getProjectUpdates(projectId).catch(() => null),
      getProjectImpacts(projectId).catch(() => []),
    ]);

    const milestones = updates ? convertToUnifiedMilestones(updates) : [];
    const { allUpdates } = aggregateProjectProfileData(project, grants, milestones, impacts);
    return allUpdates.slice(0, SERVER_FEED_MAX_ITEMS);
  } catch {
    return [];
  }
});
