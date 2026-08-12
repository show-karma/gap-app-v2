/**
 * Constants shared between the server prefetch in
 * `funding-opportunities/page.tsx` and the client `usePrograms` hook. They
 * live outside the hook file because the server component may not import a
 * module that uses client-only React APIs.
 */

/**
 * The hydrated cache entry is only considered fresh — and therefore not
 * refetched on mount — while both sides agree on this window.
 */
export const PROGRAMS_LIST_STALE_TIME = 5 * 60 * 1000;

/**
 * Default page size when no explicit limit filter is set. The server prefetch
 * has no filter store, so it hydrates with this value — the two sides must
 * agree or the hydrated entry would be structurally different from a client
 * fetch.
 */
export const DEFAULT_PROGRAMS_LIMIT = 20;
