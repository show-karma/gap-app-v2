/**
 * Shared CORS headers for /.well-known/* route handlers.
 *
 * These endpoints are unauthenticated, public-discovery files consumed by
 * AI crawlers (GPTBot, ClaudeBot, PerplexityBot), MCP clients (Cursor,
 * Claude Desktop, Codex), and indexing services (Ora, Profound). Wide-open
 * CORS is correct: no credentials are involved.
 */
import { envVars } from "./enviromentVars";

/**
 * Shared CORS preflight fields. The success and error variants below differ
 * only in their `Cache-Control` directive — everything else is identical.
 *
 * `Access-Control-Max-Age: 86400` (24h) caches the preflight result in the
 * browser so subsequent cross-origin GETs do not re-run OPTIONS on every
 * request. We don't advertise `Access-Control-Allow-Headers` — these
 * discovery routes don't accept custom request headers, and listing
 * headers we don't honour would be misleading.
 */
const BASE_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
} as const;

export const WELL_KNOWN_CORS_HEADERS = {
  ...BASE_CORS_HEADERS,
  "Cache-Control": "public, max-age=3600",
} as const;

/**
 * Headers for error responses on /.well-known/* routes. Same wide-open CORS,
 * but `Cache-Control: no-store` so CDNs (Cloudflare, Vercel edge) do not
 * cache an upstream blip for an hour.
 */
export const WELL_KNOWN_ERROR_HEADERS = {
  ...BASE_CORS_HEADERS,
  "Cache-Control": "no-store",
} as const;

/**
 * Headers for OPTIONS preflight (204 No Content) responses. Deliberately
 * omits `Cache-Control` — browsers cache preflight results via
 * `Access-Control-Max-Age` (already 86400s), not `Cache-Control`. Setting
 * `public, max-age=3600` on a 204 body is conceptually wrong and tells
 * downstream caches to retain an empty response keyed on URL.
 */
export const WELL_KNOWN_PREFLIGHT_HEADERS = {
  ...BASE_CORS_HEADERS,
} as const;

/**
 * MCP protocol version this server speaks. Centralized here so the apex
 * surfaces stay in lockstep — `mcp/server-card.json`, `agents.md`
 * (manually), and tests all reference the same value. Bump in one place
 * when the spec advances.
 */
export const MCP_PROTOCOL_VERSION = "2025-11-25";

/**
 * Strips a trailing query string and/or fragment, then trailing whitespace
 * and slash(es), from a URL string. Pure and non-throwing, so it is safe to
 * call on client components that must degrade gracefully when the env var
 * is missing or malformed (e.g. `McpConnectPage`), not just from
 * `getIndexerBaseUrl()`.
 *
 * RFC 8707 resource indicators are exact-match: a trailing slash on the
 * indexer base URL would produce `.../mcp/` where `.../mcp` is expected,
 * recreating the OAuth audience mismatch this module exists to prevent. A
 * query string or fragment is worse — interpolating `${base}/mcp` into
 * `https://host/?tenant=x` yields `https://host/?tenant=x/mcp`, landing
 * `/mcp` inside the query component instead of the path.
 *
 * The query/fragment is cut first (everything from the first `?` or `#`
 * onward), then whitespace is trimmed, then any trailing run of whitespace
 * and/or slashes is stripped in a single pass — a misconfigured env var
 * like `"https://host// "` (slash, then space, then nothing after) would
 * otherwise leave a dangling space or slash behind a naive single-pass
 * trim/replace. `URL.canParse` in `getIndexerBaseUrl()` tolerates
 * leading/trailing whitespace (the `URL` constructor trims before parsing)
 * and does not reject a query string or fragment, so a value can pass
 * validation while still carrying content this function must remove before
 * the string is used to build a `/mcp` URL. `getIndexerBaseUrl()` itself
 * throws on a query/fragment-bearing value (fail loud, server-side); this
 * function's stripping keeps client-side normalization coherent with that
 * same value even when no exception can be raised (fail safe, client-side).
 */
export function normalizeBaseUrl(url: string): string {
  if (typeof url !== "string") return url;
  return url
    .split(/[?#]/)[0]
    .trim()
    .replace(/[\s/]+$/, "");
}

/**
 * Returns the indexer base URL or throws if it is unset or malformed.
 *
 * The /.well-known/* route handlers depend on this URL at build time
 * (`force-static` + ISR). A misconfigured deploy without
 * NEXT_PUBLIC_GAP_INDEXER_URL would otherwise ship `undefined/mcp` to
 * production. This helper makes that fail loudly during `next build`.
 *
 * Format validation via `URL.canParse` catches missing schemes
 * (`gapapi.karmahq.xyz` instead of `https://gapapi.karmahq.xyz`) and
 * structurally invalid URLs. It does NOT catch typos with a valid scheme
 * (e.g. `https://gapap.karmahq.xyz`) — those still ship.
 *
 * A query string or fragment also passes `URL.canParse` (it's a valid URL),
 * but a base URL must not carry one: interpolating `${base}/mcp` into
 * `https://host/?tenant=x` lands `/mcp` inside the query component instead
 * of the path, silently corrupting every downstream MCP URL. This is
 * checked explicitly and rejected below.
 */
export function getIndexerBaseUrl(): string {
  const url = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
  if (!url || typeof url !== "string" || url.trim() === "") {
    throw new Error("NEXT_PUBLIC_GAP_INDEXER_URL is not set. Required for /.well-known/* routes.");
  }
  if (!URL.canParse(url)) {
    throw new Error(
      `NEXT_PUBLIC_GAP_INDEXER_URL is not a valid URL: "${url}". Expected a fully-qualified URL like https://gapapi.karmahq.xyz.`
    );
  }
  const parsed = new URL(url);
  if (parsed.search || parsed.hash) {
    throw new Error(
      `NEXT_PUBLIC_GAP_INDEXER_URL must not contain a query string or fragment: "${url}". Expected a bare base URL like https://gapapi.karmahq.xyz.`
    );
  }
  return normalizeBaseUrl(url);
}
