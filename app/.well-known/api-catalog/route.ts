import { NextResponse } from "next/server";
import { SITE_URL } from "@/utilities/meta";
import { getIndexerBaseUrl, WELL_KNOWN_CORS_HEADERS } from "@/utilities/wellKnown";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * RFC 9727 API Catalog — a linkset of the APIs Karma publishes, with
 * pointers to their description (OpenAPI), human docs (Swagger UI), and
 * additional metadata (plugin manifest).
 *
 * The official media type is `application/linkset+json`, but Ora and
 * other crawlers probe this endpoint expecting plain JSON. We serve JSON
 * with the same linkset structure so consumers that follow the RFC and
 * consumers that probe-by-path both succeed.
 */

export function GET() {
  const apiUrl = getIndexerBaseUrl();

  const body = {
    linkset: [
      {
        anchor: SITE_URL,
        "service-desc": [
          {
            href: `${SITE_URL}/openapi.json`,
            type: "application/json",
          },
        ],
        "service-doc": [
          {
            href: `${apiUrl}/v2/docs`,
            type: "text/html",
          },
        ],
        "service-meta": [
          {
            href: `${SITE_URL}/.well-known/ai-plugin.json`,
            type: "application/json",
          },
        ],
      },
    ],
  };

  return NextResponse.json(body, { headers: WELL_KNOWN_CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: WELL_KNOWN_CORS_HEADERS });
}
