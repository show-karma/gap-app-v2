import { NextResponse } from "next/server";
import { SITE_URL } from "@/utilities/meta";
import { WELL_KNOWN_CORS_HEADERS, WELL_KNOWN_PREFLIGHT_HEADERS } from "@/utilities/wellKnown";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * Generic agent discovery aggregator.
 *
 * The "agent.json" convention is not yet a formal standard, but Ora and
 * other agent-discovery crawlers flag its absence. We publish a small
 * pointer document that aggregates every other discovery surface Karma
 * exposes so a crawler hitting this single file can find OpenAPI, MCP,
 * A2A, OAuth metadata, and the LLM-friendly text references.
 */

export function GET() {
  const body = {
    name: "Karma",
    description:
      "AI-powered funding software. MCP-ready for Claude, Cursor, Codex, and any compatible client.",
    discovery: {
      openapi: `${SITE_URL}/openapi.json`,
      mcp: `${SITE_URL}/.well-known/mcp.json`,
      mcpServerCard: `${SITE_URL}/.well-known/mcp/server-card.json`,
      aiPlugin: `${SITE_URL}/.well-known/ai-plugin.json`,
      agentCard: `${SITE_URL}/.well-known/agent-card.json`,
      oauthProtectedResource: `${SITE_URL}/.well-known/oauth-protected-resource`,
      llmsTxt: `${SITE_URL}/llms.txt`,
    },
    contact: "info@karmahq.xyz",
  };

  return NextResponse.json(body, { headers: WELL_KNOWN_CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: WELL_KNOWN_PREFLIGHT_HEADERS });
}
