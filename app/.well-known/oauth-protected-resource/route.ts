import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import {
  getIndexerBaseUrl,
  WELL_KNOWN_CORS_HEADERS,
  WELL_KNOWN_ERROR_HEADERS,
  WELL_KNOWN_PREFLIGHT_HEADERS,
} from "@/utilities/wellKnown";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * RFC 9728 OAuth Protected Resource Metadata at the apex.
 *
 * RFC 9728 §3.1 puts the canonical document at
 * `${resource}/.well-known/oauth-protected-resource/<resource-path>` —
 * which for Karma's MCP server lives on the indexer at
 * `${indexer}/.well-known/oauth-protected-resource/v2/mcp`. Ora and other
 * agent crawlers, however, probe the root-rooted apex path
 * `https://www.karmahq.xyz/.well-known/oauth-protected-resource`, so we
 * proxy the indexer's document here. Hourly-revalidated ISR, 5s timeout,
 * Sentry-captured on failure, no-cache 502 fallback. Same shape as the
 * /openapi.json and /.well-known/mcp-tools.json proxies.
 */

const FALLBACK_BODY = { error: "upstream_unavailable" };
const UPSTREAM_TIMEOUT_MS = 5000;

export async function GET() {
  try {
    const res = await fetch(`${getIndexerBaseUrl()}/.well-known/oauth-protected-resource/v2/mcp`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!res.ok) {
      Sentry.captureException(
        new Error(`Upstream /.well-known/oauth-protected-resource/v2/mcp returned ${res.status}`),
        {
          tags: { route: "well-known/oauth-protected-resource" },
          extra: { status: res.status },
        }
      );
      return NextResponse.json(FALLBACK_BODY, {
        status: 502,
        headers: WELL_KNOWN_ERROR_HEADERS,
      });
    }

    const body = await res.json();
    return NextResponse.json(body, { headers: WELL_KNOWN_CORS_HEADERS });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "well-known/oauth-protected-resource" },
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
