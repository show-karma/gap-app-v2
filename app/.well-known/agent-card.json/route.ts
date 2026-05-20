import { NextResponse } from "next/server";
import { SITE_URL } from "@/utilities/meta";
import { WELL_KNOWN_CORS_HEADERS, WELL_KNOWN_PREFLIGHT_HEADERS } from "@/utilities/wellKnown";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * A2A (Agent-to-Agent) Agent Card discovery document.
 *
 * Schema reference: https://github.com/google-a2a/a2a-spec — the spec is
 * evolving, so we ship a best-effort shape with the conventional
 * top-level `agent` envelope, provider info, capability flags, and
 * accepted auth schemes. Static + ISR like the other discovery routes.
 *
 * Skills/tools are intentionally NOT enumerated here. The single source
 * of truth is the indexer's tool registry, surfaced at
 * /.well-known/mcp-tools.json (auto-derived from factory definitions).
 * `skillsDiscovery` points agents at that catalog instead of duplicating
 * a hand-curated list that drifts from reality.
 */

export function GET() {
  // Ora and similar AEO crawlers look at the root for `name` and
  // `description`, while A2A consumers expect the nested `agent` envelope.
  // We expose both — same values, no drift.
  const name = "Karma";
  const description =
    "Discover funding programs, projects, milestones, and impact data. Submit applications, track grants, and post updates via an MCP server with OAuth.";

  const body = {
    name,
    description,
    agent: {
      name,
      description,
      url: SITE_URL,
      version: "1.0.0",
      documentationUrl: `${SITE_URL}/mcp/connect`,
      provider: {
        name: "Karma",
        url: SITE_URL,
      },
      capabilities: {
        streaming: false,
        pushNotifications: false,
        stateTransitionHistory: false,
      },
      authentication: {
        schemes: ["oauth2", "apiKey"],
      },
      skillsDiscovery: {
        url: `${SITE_URL}/.well-known/mcp-tools.json`,
        format: "mcp-public-tool-list",
        description:
          "Live tool catalog derived from the MCP server's registered tools — no hand-maintained skills list to drift.",
      },
    },
  };

  return NextResponse.json(body, { headers: WELL_KNOWN_CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: WELL_KNOWN_PREFLIGHT_HEADERS });
}
