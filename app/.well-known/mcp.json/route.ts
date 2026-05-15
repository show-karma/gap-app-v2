import { NextResponse } from "next/server";
import { envVars } from "@/utilities/enviromentVars";
import { SITE_URL } from "@/utilities/meta";
import { WELL_KNOWN_CORS_HEADERS } from "@/utilities/wellKnown";

export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  const apiUrl = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

  const body = {
    mcpServers: {
      karma: {
        url: `${apiUrl}/v2/mcp`,
        transport: "http",
        description: "Karma — funding programs, projects, milestones, and impact data.",
        auth: {
          type: "oauth2",
          metadata: `${apiUrl}/.well-known/oauth-protected-resource/v2/mcp`,
        },
        documentation: `${SITE_URL}/mcp/connect`,
      },
    },
  };

  return NextResponse.json(body, { headers: WELL_KNOWN_CORS_HEADERS });
}
