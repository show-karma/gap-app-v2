import type { UseQueryOptions } from "@tanstack/react-query";

/**
 * `staleTime` for queries that render ABOVE crawlable content.
 *
 * React Query reads `Date.now()` while deciding whether a query is stale, and
 * `cacheComponents` rejects that during prerender:
 *
 *   Next.js encountered the unstable value `Date.now()` in a Client Component.
 *     at hooks/useProject.ts:12 (useQuery)
 *
 * The usual fix is a Suspense boundary, but DEV-612 forbids one above the
 * content of a sitemap-crawlable route — it would stream the article as a
 * hidden late chunk that only JavaScript reveals.
 *
 * `"static"` is the escape hatch, and it works by construction rather than by
 * luck. In @tanstack/query-core 5.87.1 both gates short-circuit on it *before*
 * any clock read:
 *
 *   query.js:118      isStaleByTime()  -> `if (staleTime === "static") return false;`
 *                                         (returns before `timeUntilStale`)
 *   queryObserver.js:446 shouldFetchOn() -> `... && resolveStaleTime(...) !== "static"`
 *                                         (returns before `isStale`)
 *
 * and `Date.now()` lives only in `utils.js:13 timeUntilStale`, which neither
 * path reaches.
 *
 * THE TRADE-OFF, which is the whole reason this is opt-in rather than a default:
 * a "static" query is never stale, so it never refetches on mount, focus or
 * reconnect, and `isStaleByTime` returns false before it even checks
 * `isInvalidated`. The hydrated payload is what the reader sees until something
 * explicitly calls `refetch()`. That is defensible on a route whose server data
 * is already a 60s-revalidated cached document, and wrong anywhere the user
 * expects their own edits to appear — so it is passed in per call site, never
 * set globally.
 */
export const PRERENDER_SAFE_STALE_TIME = "static" satisfies UseQueryOptions["staleTime"];
