import { SITE_URL } from "@/utilities/meta";
import { WELL_KNOWN_PREFLIGHT_HEADERS } from "@/utilities/wellKnown";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * Developer-scoped llms.txt at /developers/llms.txt.
 *
 * Smallest of the modular llms.txt files — just the entry points a
 * developer or AI-agent integrator needs to start building. Skim-first
 * surface; the apex /llms.txt + /api/llms.txt + /docs/llms.txt go deeper.
 */

const MARKDOWN = `# Karma — Developers

> Build with Karma. MCP server, REST API, agent surfaces, and discovery files.

## Start here
- MCP setup guide: ${SITE_URL}/mcp/connect
- For AI agents: ${SITE_URL}/for-agents

## Specs
- OpenAPI spec (JSON): ${SITE_URL}/openapi.json
- Agent instructions: ${SITE_URL}/agents.md

## Discovery
- Agent card (A2A): ${SITE_URL}/.well-known/agent-card.json
- MCP server card: ${SITE_URL}/.well-known/mcp/server-card.json

## Reference
- llms-full.txt (inline content): ${SITE_URL}/llms-full.txt
- API-scoped llms.txt: ${SITE_URL}/api/llms.txt
- Docs-scoped llms.txt: ${SITE_URL}/docs/llms.txt

## Contact
- info@karmahq.xyz
`;

const PLAIN_TEXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
} as const;

export function GET() {
  return new Response(MARKDOWN, { status: 200, headers: PLAIN_TEXT_HEADERS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: WELL_KNOWN_PREFLIGHT_HEADERS });
}
