import { NextResponse } from "next/server";
import { SITE_URL } from "@/utilities/meta";
import { getIndexerBaseUrl, WELL_KNOWN_CORS_HEADERS } from "@/utilities/wellKnown";

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
 */

export function GET() {
  const apiUrl = getIndexerBaseUrl();

  const body = {
    name: "gap-tools",
    alternateNames: ["karma-gap-tools"],
    version: "1.0.0",
    protocolVersion: "2025-11-25",
    transport: "http",
    url: `${apiUrl}/v2/mcp`,
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
  return new Response(null, { status: 204, headers: WELL_KNOWN_CORS_HEADERS });
}
