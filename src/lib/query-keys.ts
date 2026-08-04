/**
 * Centralized query key factories for whitelabel-ported hooks.
 * Using factories prevents key collisions across multi-tenant queries.
 *
 * Convention:
 * - `all` — prefix used for broad invalidation (e.g. after draft save)
 * - `detail(...)` — fully-qualified key for a specific resource
 */

export const applicationKeys = {
  all: ["application"] as const,
  detail: (communityId: string, id: string, auth: boolean) =>
    ["application", communityId, id, auth] as const,
};

export const wlQueryKeys = {
  comments: {
    /**
     * Public (unauthenticated) comments keyed by referenceNumber + communityId.
     * communityId prevents cache collisions when the same referenceNumber
     * appears in multiple tenants.
     */
    public: (referenceNumber: string, communityId: string) =>
      ["wl-public-comments", referenceNumber, communityId] as const,
    /**
     * Authenticated application comments keyed by applicationId + communityId.
     */
    application: (applicationId: string, communityId: string) =>
      ["wl-application-comments", applicationId, communityId] as const,
  },
  programs: {
    /**
     * Programs list for a community. Includes user address so authenticated
     * and unauthenticated views cache separately. Use `null` (not `undefined`)
     * for the unauth state to keep the key stable.
     */
    list: (communityId: string, address?: string | null) =>
      ["wl-programs-list", communityId, address ?? null] as const,
    /**
     * The public funding-program directory of a community. Shared by the
     * server prefetch in `funding-opportunities/page.tsx` and the client
     * `usePrograms` hook — the hydrated cache entry only lands if both sides
     * produce the same key.
     */
    communityList: (communityId: string) => ["wl-programs", communityId] as const,
    /**
     * A single funding program. Shared by the server prefetch in
     * `programs/[programId]/page.tsx` and the client `useProgram` hook — the
     * hydrated cache entry only lands if both sides produce the same key.
     */
    detail: (programId: string) => ["wl-program", programId] as const,
  },
};
