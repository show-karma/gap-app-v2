import { NextResponse } from "next/server";
import { envVars } from "@/utilities/enviromentVars";
import { WELL_KNOWN_CORS_HEADERS } from "@/utilities/wellKnown";

export const dynamic = "force-static";
export const revalidate = 3600;

const FALLBACK_BODY = { error: "upstream_unavailable", tools: [] };

export async function GET() {
  try {
    const res = await fetch(`${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/mcp/tools`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(FALLBACK_BODY, {
        status: 502,
        headers: WELL_KNOWN_CORS_HEADERS,
      });
    }

    const body = await res.json();
    return NextResponse.json(body, { headers: WELL_KNOWN_CORS_HEADERS });
  } catch {
    return NextResponse.json(FALLBACK_BODY, {
      status: 502,
      headers: WELL_KNOWN_CORS_HEADERS,
    });
  }
}
