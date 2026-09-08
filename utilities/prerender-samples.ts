/**
 * Fallback values for `generateStaticParams`.
 *
 * Under `cacheComponents` a `generateStaticParams` that returns `[]` is a build
 * error, not an empty build:
 *
 *   error: empty-generate-static-params
 *   failed collecting page data for /project/[projectId]/funding/[grantUid]/complete-grant
 *
 * The build dies at page-data collection, before any route is prerendered — so
 * "degrade to an empty list" is exactly the wrong shape here. Every sampler must
 * yield at least one param, which means a checked-in fallback for the case where
 * the build-time lookup returns nothing (indexer unreachable from the builder,
 * Sanity unconfigured on a preview, an endpoint that moved).
 *
 * Every value below was read from production on 2026-09-02 and is asserted to
 * still resolve by `__tests__/utilities/prerender-samples.parity.test.ts`. They
 * are deliberately long-lived entities. If that test fails, replace the value —
 * do not delete the fallback and do not invent one, because a fabricated id
 * prerenders a 404 into the build and a missing fallback breaks it outright.
 */

/** Projects chosen because they have grants — the grant sampler needs both halves to agree. */
export const FALLBACK_PROJECT_SLUGS: readonly string[] = [
  // 11 grants
  "karma",
  // 2 grants
  "forest---an-efficient-and-lightweight-filecoin-node",
  // 1 grant
  "bedrock",
];

/** Real grant uids on `karma`, the project with the most grants. */
export const FALLBACK_GRANT_PAIRS: ReadonlyArray<{ projectId: string; grantUid: string }> = [
  {
    projectId: "karma",
    grantUid: "0x5b6d171870ee0556a14e5fcf055a2150e02e6fbcb9cda8e39b66520e5f8d0285",
  },
  {
    projectId: "karma",
    grantUid: "0x0dbd887b57e050d9c97139d8272eaa0c40cd7103096f2dc179877daac7a767e6",
  },
];

/**
 * Real funding programs on `gitcoin`, which is the one community present in the
 * chosen list on BOTH staging and production — so this fallback resolves in
 * either environment.
 */
export const FALLBACK_PROGRAM_PAIRS: ReadonlyArray<{ communityId: string; programId: string }> = [
  { communityId: "gitcoin", programId: "989" },
  { communityId: "gitcoin", programId: "988" },
];

/** Published posts, taken from the production sitemap. */
export const FALLBACK_BLOG_SLUGS: readonly string[] = [
  "launching-nonprofit-research-for-donor-advisors",
  "karma-ships-july-edition",
  "august-2025",
];

/**
 * Guarantees a non-empty param list.
 *
 * Prefers what the build actually found; falls back to the checked-in values
 * only when the lookup came back empty, and never returns `[]`.
 */
export function withPrerenderFallback<T>(found: readonly T[], fallback: readonly T[]): T[] {
  return found.length > 0 ? [...found] : [...fallback];
}
