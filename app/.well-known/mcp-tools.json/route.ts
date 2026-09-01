import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import {
  getIndexerBaseUrl,
  WELL_KNOWN_CORS_HEADERS,
  WELL_KNOWN_ERROR_HEADERS,
  WELL_KNOWN_PREFLIGHT_HEADERS,
} from "@/utilities/wellKnown";

// The 3600s cache lives on the upstream fetch below (`next: { revalidate:
// 3600 }`), not on a segment config. `dynamic = "force-static"` +
// `revalidate = 3600` were redundant with it and cacheComponents rejects
// both. This handler is deliberately NOT wrapped in `"use cache"`: it
// returns 502 with different headers on upstream failure, and a cached
// function can only return one serializable value, so caching it would
// have to cache the failure too.

const FALLBACK_BODY = { error: "upstream_unavailable", tools: [] };
const UPSTREAM_TIMEOUT_MS = 5000;

export async function GET() {
  try {
    const res = await fetch(`${getIndexerBaseUrl()}/mcp/tools`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!res.ok) {
      Sentry.captureException(new Error(`Upstream /mcp/tools returned ${res.status}`), {
        tags: { route: "well-known/mcp-tools" },
        extra: { status: res.status },
      });
      return NextResponse.json(FALLBACK_BODY, {
        status: 502,
        headers: WELL_KNOWN_ERROR_HEADERS,
      });
    }

    const body = await res.json();
    return NextResponse.json(body, { headers: WELL_KNOWN_CORS_HEADERS });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "well-known/mcp-tools" },
    });
    return NextResponse.json(FALLBACK_BODY, {
      status: 502,
      headers: WELL_KNOWN_ERROR_HEADERS,
    });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: WELL_KNOWN_PREFLIGHT_HEADERS });
}
