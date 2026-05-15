/**
 * Shared CORS headers for /.well-known/* route handlers.
 *
 * These endpoints are unauthenticated, public-discovery files consumed by
 * AI crawlers (GPTBot, ClaudeBot, PerplexityBot), MCP clients (Cursor,
 * Claude Desktop, Codex), and indexing services (Ora, Profound). Wide-open
 * CORS is correct: no credentials are involved.
 */
export const WELL_KNOWN_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=3600",
} as const;
