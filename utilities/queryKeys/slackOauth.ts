/**
 * Query-key factory for the Slack OAuth admin surface.
 *
 * Convention (matches `src/lib/query-keys.ts`):
 * - `all` — broad prefix for coarse invalidation after mutations
 * - `workspace(slug)` — specific workspace query
 *
 * Factories return tuples (readonly arrays) to satisfy React Query's
 * QueryKey type and to avoid accidental key mutation.
 */

export const slackOauthKeys = {
  all: ["slack-oauth"] as const,

  workspace: (slug: string | undefined) => ["slack-oauth", "workspace", slug ?? ""] as const,
};
