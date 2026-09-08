/**
 * Request options for a read whose payload is public — the same bytes for an
 * anonymous visitor and a signed-in one.
 *
 * `api.get` defaults `isAuthorized` to `true`, so every server-side read goes
 * through `TokenManager.getToken()` → `getServerToken()` → a dynamic
 * `import("next/headers")` → `cookies()`. On the server that costs twice:
 *
 * 1. It is a request read, so the route can never be prerendered — the error
 *    reads "uncached or runtime data during prerendering" and it is why the
 *    crawlable community, project, projects and funding-map routes cannot go
 *    Cache-class.
 * 2. Once those payloads are cached, a response built with somebody's token
 *    would be served to everyone. That is the cache-poisoning line the Instant
 *    Navigations plan draws, and this helper is how a loader stays on the safe
 *    side of it: a cached read demonstrably carries no `Authorization` header.
 *
 * On the client the token stays attached. Nothing here is about hiding data
 * from the user who owns it — it is about what the *server* renders into a
 * shared, cacheable document. Anything genuinely role-scoped belongs in a
 * client fetch or behind a boundary below the crawlable content.
 *
 * The precedent is `services/project-grants.service.ts`, which has passed
 * `isAuthorized: false` on the public project-profile SSR path since #1571 for
 * the same reason.
 *
 * @see .maestri/reports/phase-2-triage-matrix.md — D2
 */
export function publicReadOptions(): { isAuthorized: boolean } {
  // `window` is the only reliable server/client discriminator here: these
  // loaders are imported by server components, by React Query on the client,
  // and by the server prefetch that feeds the client's hydration cache.
  return { isAuthorized: typeof window !== "undefined" };
}

/** True while rendering on the server, where no request token may be read. */
export function isServerRead(): boolean {
  return typeof window === "undefined";
}
