import "server-only";

import { type DehydratedState, dehydrate, QueryClient } from "@tanstack/react-query";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";

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
 */
export async function buildDehydratedState(
  seed: (queryClient: QueryClient) => Promise<void>
): Promise<DehydratedState> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: defaultQueryOptions },
  });

  await seed(queryClient);

  return dehydrate(queryClient);
}
