import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getExplorerProjectsPaginated } from "@/services/projects-explorer.service";
import type { PaginatedProjectsResponse } from "@/types/v2/project";
import { projectListTag } from "@/utilities/cache/tags";

/**
 * Cached, server-only twin of the explorer's paginated loader — the `/projects`
 * SSR read.
 *
 * `getExplorerProjectsPaginated` itself stays uncached: it is imported by
 * `components/Pages/NewProjects`, a client component, and a `"use cache"`
 * function cannot be called from the client. See the note in
 * `getCommunityData.cached.ts` for why the split is the right shape.
 *
 * The params type is not exported from the service, so it is read back off the
 * function rather than duplicated here — that way it cannot drift.
 *
 * The loader swallows its own failures and returns an empty page, so a failed
 * upstream call would be cached as an empty result for the `cacheLife` window.
 * That is the same trade the route already made under `revalidate = 60`, and
 * the 60s revalidate bounds it.
 */
export async function getExplorerProjectsPaginatedCached(
  params: Parameters<typeof getExplorerProjectsPaginated>[0]
): Promise<PaginatedProjectsResponse> {
  "use cache";
  cacheLife("minutes");
  cacheTag(projectListTag());

  return getExplorerProjectsPaginated(params);
}
