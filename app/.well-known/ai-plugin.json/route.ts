import { NextResponse } from "next/server";
import { SITE_URL } from "@/utilities/meta";
import {
  getIndexerBaseUrl,
  WELL_KNOWN_CORS_HEADERS,
  WELL_KNOWN_PREFLIGHT_HEADERS,
} from "@/utilities/wellKnown";

export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  const apiUrl = getIndexerBaseUrl();

  const body = {
    schema_version: "v1",
    name_for_human: "Karma",
    name_for_model: "karma",
    description_for_human:
      "Discover funding programs, projects, milestones, and impact data on Karma.",
    description_for_model:
      "Read projects, grants, milestones, programs, and impact data on Karma. Public reads available without auth; mutating tools require API key or OAuth.",
    auth: {
      type: "oauth",
      authorization_url: `${apiUrl}/v2/oauth/authorize`,
      scope: "mcp",
    },
    api: {
      type: "openapi",
      url: `${SITE_URL}/openapi.json`,
    },
    logo_url: `${SITE_URL}/logo/karma-logo.svg`,
    contact_email: "info@karmahq.xyz",
    legal_info_url: `${SITE_URL}/terms-and-conditions`,
  };

  return NextResponse.json(body, { headers: WELL_KNOWN_CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: WELL_KNOWN_PREFLIGHT_HEADERS });
}
