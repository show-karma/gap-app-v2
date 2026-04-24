/**
 * Query-key factory for the Slack OAuth admin surface.
 *
 * Convention (matches `src/lib/query-keys.ts`):
 * - `all` — broad prefix for coarse invalidation after mutations
 * - `workspace(slug)` — specific workspace query
 * - `userLinks(slug, query)` — paginated links list; query object is
 *   included so different filter combos cache separately
 * - `members(slug, uid, q)` — workspace member search results
 *
 * Factories return tuples (readonly arrays) to satisfy React Query's
 * QueryKey type and to avoid accidental key mutation.
 */

export const slackOauthKeys = {
  all: ["slack-oauth"] as const,

  workspace: (slug: string | undefined) =>
    ["slack-oauth", "workspace", slug ?? ""] as const,

  userLinksAll: (slug: string | undefined) =>
    ["slack-oauth", "user-links", slug ?? ""] as const,

  userLinks: (
    slug: string | undefined,
    query?: { karmaUserId?: string; page?: number; limit?: number }
  ) => ["slack-oauth", "user-links", slug ?? "", query ?? {}] as const,

  members: (
    slug: string | undefined,
    uid: string | undefined,
    q?: string
  ) => ["slack-oauth", "members", slug ?? "", uid ?? "", q ?? ""] as const,
};
