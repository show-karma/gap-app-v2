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
 * Returns the indexer base URL or throws if it is unset.
 *
 * The /.well-known/* route handlers depend on this URL at build time
 * (`force-static` + ISR). A misconfigured deploy without
 * NEXT_PUBLIC_GAP_INDEXER_URL would otherwise ship `undefined/v2/...` to
 * production. This helper makes that fail loudly during `next build`.
 */
export function getIndexerBaseUrl(): string {
  const url = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
  if (!url || typeof url !== "string" || url.trim() === "") {
    throw new Error("NEXT_PUBLIC_GAP_INDEXER_URL is not set. Required for /.well-known/* routes.");
  }
  return url;
}
