import { NextResponse } from "next/server";
import { SITE_URL } from "@/utilities/meta";
import {
  getIndexerBaseUrl,
  MCP_PROTOCOL_VERSION,
  WELL_KNOWN_CORS_HEADERS,
  WELL_KNOWN_PREFLIGHT_HEADERS,
} from "@/utilities/wellKnown";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * MCP server-card discovery document at the Ora-preferred nested path
 * /.well-known/mcp/server-card.json.
 *
 * No fully-documented public standard yet (MCP discovery is in flux), so
 * this is a best-effort shape: identifier + protocol version, transport,
 * canonical server URL on the indexer, references to the OpenAPI spec and
 * connect docs on the apex, and accepted auth schemes (OAuth metadata
 * URL + API-key header). Refine after the next orank rescan.
 *
 * `protocolVersion` reads from MCP_PROTOCOL_VERSION in utilities/wellKnown
 * so a spec bump touches one constant, not three files.
 *
 * Distinct from /.well-known/mcp.json: that file uses the Claude Desktop /
 * Cursor LOCAL CONFIG shape (`mcpServers.karma: { url, transport, auth }`)
 * and is what MCP-client registries crawl. This server-card.json is the
 * Ora-preferred discovery shape (flat metadata + alternateNames + nested
 * `authentication` object). Both link out to the same MCP endpoint; they
 * exist to satisfy two different crawler conventions, not to duplicate.
 */

export function GET() {
  const apiUrl = getIndexerBaseUrl();

  const body = {
    name: "gap-tools",
    alternateNames: ["karma-gap-tools"],
    description:
      "MCP server for Karma — discover funding programs, projects, milestones, grants, and impact data across 8 blockchain networks. Read-only public tools without auth; OAuth or API-key for mutations.",
    version: "1.0.0",
    protocolVersion: MCP_PROTOCOL_VERSION,
    transport: "http",
    url: `${apiUrl}/mcp`,
    documentation: `${SITE_URL}/mcp/connect`,
    openapi: `${SITE_URL}/openapi.json`,
    authentication: {
      oauth2: {
        metadata: `${SITE_URL}/.well-known/oauth-protected-resource`,
      },
      apiKey: {
        header: "x-api-key",
      },
    },
    publisher: {
      name: "Karma",
      url: SITE_URL,
      email: "info@karmahq.xyz",
    },
  };

  return NextResponse.json(body, { headers: WELL_KNOWN_CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: WELL_KNOWN_PREFLIGHT_HEADERS });
}
