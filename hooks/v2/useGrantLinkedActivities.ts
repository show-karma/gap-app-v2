import { useMemo } from "react";
import type { ProjectUpdate as V2ProjectUpdate } from "@/types/v2/roadmap";
import { useProjectUpdates } from "./useProjectUpdates";

/**
 * Returns the subset of a project's activity updates that are linked to a
 * specific grant via `associations.funding[].uid`. Used by the grant
 * milestones-and-updates page so activities created against the grant show
 * up even when the grant has no milestones or grant-updates of its own.
 *
 * Shares the React Query cache key with `useProjectUpdates(projectId)` so
 * mutations on either the project page or the grant page invalidate both.
 */
export function useGrantLinkedActivities(
  projectIdOrSlug: string,
  grantUid: string | undefined
): V2ProjectUpdate[] {
  const { rawData } = useProjectUpdates(projectIdOrSlug);

  return useMemo(() => {
    const all = rawData?.projectUpdates || [];
    const grantUidLower = grantUid?.toLowerCase();
    if (!grantUidLower) return [];
    return all.filter((update) =>
      update.associations?.funding?.some((f) => f.uid?.toLowerCase() === grantUidLower)
    );
  }, [rawData, grantUid]);
}
