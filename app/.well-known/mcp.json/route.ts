import { cacheLife } from "next/cache";
import { NextResponse } from "next/server";
import { SITE_URL } from "@/utilities/meta";
import {
  getIndexerBaseUrl,
  WELL_KNOWN_CORS_HEADERS,
  WELL_KNOWN_PREFLIGHT_HEADERS,
} from "@/utilities/wellKnown";

async function buildBody() {
  "use cache";
  cacheLife("hours");

  const apiUrl = getIndexerBaseUrl();

  const body = {
    mcpServers: {
      karma: {
        url: `${apiUrl}/mcp`,
        transport: "http",
        description: "Karma — funding programs, projects, milestones, and impact data.",
        auth: {
          type: "oauth2",
          metadata: `${apiUrl}/.well-known/oauth-protected-resource/mcp`,
        },
        documentation: `${SITE_URL}/mcp/connect`,
      },
    },
  };

  return body;
}

export async function GET() {
  return NextResponse.json(await buildBody(), { headers: WELL_KNOWN_CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: WELL_KNOWN_PREFLIGHT_HEADERS });
}
