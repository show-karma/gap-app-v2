import "server-only";

import { type DehydratedState, dehydrate, QueryClient } from "@tanstack/react-query";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { quantizeRenderTime } from "@/utilities/render-clock-server";

/**
 * Build a dehydrated React Query cache inside a `"use cache"` function.
 *
 * `prefetchQuery` and `dehydrate` both stamp entries with `Date.now()`, and
 * `cacheComponents` rejects an unstable value during prerender:
 *
 *   Next.js encountered the unstable value `Date.now()` while prerendering.
 *
 * Caching the loader cannot fix that — the timestamp is produced by the seeding
 * step above it. So the whole seed becomes the cached unit: the timestamp is
 * prerendered as part of the cached value rather than read at render time.
 *
 * Callers pass a builder that seeds a fresh client. The client must be built
 * here, never passed in: a QueryClient is not serializable and must not cross
 * the cache boundary. Only the dehydrated JSON comes back out.
 *
 * The timestamps are then rounded to the render clock (see
 * `stabilizeSeedTimestamps`), so a seed rebuilt from unchanged data is
 * byte-identical to the previous one.
 */
export async function buildDehydratedState(
  seed: (queryClient: QueryClient) => Promise<void>
): Promise<DehydratedState> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: defaultQueryOptions },
  });

  await seed(queryClient);

  return stabilizeSeedTimestamps(dehydrate(queryClient), quantizeRenderTime(Date.now()));
}

/**
 * Replace the per-query fetch timestamps with one rounded clock value.
 *
 * The seed is serialized into the cached page, and React Query stamps each
 * query with the millisecond it resolved — so every regeneration produced a
 * different page, and every one was stored as a new ISR write even when the
 * data had not changed. Rounding to the render clock (`useRenderedAt()` sees
 * the same value) keeps the page identical until the data or the hour changes.
 *
 * Reporting an earlier fetch time is safe in both directions React Query uses
 * it: the seed only looks older, so the client refetches on mount as it already
 * does for any seed past `staleTime`, and `hydrate()` never lets a seed that
 * looks older overwrite data the client fetched itself.
 */
export function stabilizeSeedTimestamps(state: DehydratedState, stamp: number): DehydratedState {
  return {
    ...state,
    queries: state.queries.map((query) => ({
      ...query,
      ...(query.dehydratedAt === undefined ? {} : { dehydratedAt: stamp }),
      state: {
        ...query.state,
        dataUpdatedAt: query.state.dataUpdatedAt ? stamp : 0,
        errorUpdatedAt: query.state.errorUpdatedAt ? stamp : 0,
      },
    })),
  };
}
