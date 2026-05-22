import { SITE_URL } from "@/utilities/meta";
import { getIndexerBaseUrl, WELL_KNOWN_PREFLIGHT_HEADERS } from "@/utilities/wellKnown";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * API-scoped llms.txt at /api/llms.txt.
 *
 * Narrow companion file describing Karma's machine-facing surface:
 * OpenAPI spec, Swagger UI, MCP endpoint, auth metadata, and the
 * `.well-known/*` discovery files.
 *
 * Note: `/api/*` is otherwise `Disallow:`d in robots.ts. The robots
 * config carries a sibling `Allow: /api/llms.txt` so AI crawlers can
 * still reach this one file without opening the broader /api/* surface.
 */

function buildBody(): string {
  const apiUrl = getIndexerBaseUrl();
  return `# Karma — API

> Machine-facing surface for Karma. REST API, MCP server, OpenAPI spec, and well-known discovery documents.

## Spec and docs
- OpenAPI spec (JSON, apex proxy): ${SITE_URL}/openapi.json
- Swagger UI: ${apiUrl}/v2/docs
- OpenAPI spec (canonical): ${apiUrl}/v2/docs/json

## MCP
- MCP endpoint (JSON-RPC over HTTP): ${apiUrl}/v2/mcp
- MCP setup guide (human docs): ${SITE_URL}/mcp/connect
- For AI agents: ${SITE_URL}/for-agents
- MCP server card: ${SITE_URL}/.well-known/mcp/server-card.json
- MCP server discovery (Cursor/Claude Desktop shape): ${SITE_URL}/.well-known/mcp.json
- Public tool catalog: ${SITE_URL}/.well-known/mcp-tools.json

## Authentication
- OAuth protected resource metadata (RFC 9728): ${SITE_URL}/.well-known/oauth-protected-resource
- API key header: \`x-api-key\` (generate at ${SITE_URL}/agent-setup)

## Discovery
- Plugin manifest: ${SITE_URL}/.well-known/ai-plugin.json
- API catalog (RFC 9727): ${SITE_URL}/.well-known/api-catalog
- Agent card (A2A): ${SITE_URL}/.well-known/agent-card.json
- Agent discovery: ${SITE_URL}/.well-known/agent.json

## Apex pointers
- Full llms.txt: ${SITE_URL}/llms.txt
- llms-full.txt (inline content): ${SITE_URL}/llms-full.txt
- Agent instructions: ${SITE_URL}/agents.md
`;
}

const PLAIN_TEXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
} as const;

export function GET() {
  return new Response(buildBody(), { status: 200, headers: PLAIN_TEXT_HEADERS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: WELL_KNOWN_PREFLIGHT_HEADERS });
}
