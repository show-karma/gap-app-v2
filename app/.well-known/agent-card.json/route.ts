import { NextResponse } from "next/server";
import { SITE_URL } from "@/utilities/meta";
import { WELL_KNOWN_CORS_HEADERS } from "@/utilities/wellKnown";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * A2A (Agent-to-Agent) Agent Card discovery document.
 *
 * Schema reference: https://github.com/google-a2a/a2a-spec — the spec is
 * evolving, so we ship a best-effort shape with the conventional
 * top-level `agent` envelope, provider info, capability flags, accepted
 * auth schemes, and a short list of high-level skills. Static + ISR like
 * the other discovery routes — no upstream dependency.
 */

export function GET() {
  const body = {
    agent: {
      name: "Karma",
      description:
        "Discover funding programs, projects, milestones, and impact data. Submit applications, track grants, and post updates via an MCP server with OAuth.",
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
      skills: [
        {
          id: "discover-funding",
          name: "Discover funding programs",
          description:
            "Search open programs across communities, by chain, category, deadline, or budget.",
        },
        {
          id: "read-project",
          name: "Read project details",
          description: "Project profile, team, milestones, grants, and impact indicators.",
        },
        {
          id: "submit-application",
          name: "Submit a grant application",
          description:
            "Draft, validate, and submit applications to funding programs (OAuth required).",
        },
        {
          id: "audit-milestones",
          name: "Audit milestone delivery",
          description:
            "List pending, overdue, and recently-completed milestones across a program or project.",
        },
      ],
    },
  };

  return NextResponse.json(body, { headers: WELL_KNOWN_CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: WELL_KNOWN_CORS_HEADERS });
}
