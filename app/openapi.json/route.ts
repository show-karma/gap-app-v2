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

/**
 * Serves the indexer's OpenAPI spec from the marketing-domain apex so
 * agent crawlers (Ora, Profound, etc.) that probe predictable paths
 * like https://www.karmahq.org/openapi.json find it without having to
 * walk the .well-known/ai-plugin.json manifest first.
 *
 * Hourly-revalidated ISR proxy of `${indexer}/v2/docs/json`. Same
 * resilience pattern as /.well-known/mcp-tools.json: 5s timeout,
 * Sentry-captured on failure, no-cache 502 fallback so CDNs don't
 * pin a transient upstream blip for an hour.
 */

const FALLBACK_BODY = {
  error: "upstream_unavailable",
  openapi: "3.0.0",
  info: { title: "Karma API", version: "unknown" },
  paths: {},
};
const UPSTREAM_TIMEOUT_MS = 5000;

export async function GET() {
  try {
    const res = await fetch(`${getIndexerBaseUrl()}/v2/docs/json`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!res.ok) {
      Sentry.captureException(new Error(`Upstream /v2/docs/json returned ${res.status}`), {
        tags: { route: "openapi" },
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
      tags: { route: "openapi" },
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
