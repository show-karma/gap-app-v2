import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { envVars } from "@/utilities/enviromentVars";
import {
  getIndexerBaseUrl,
  WELL_KNOWN_CORS_HEADERS,
  WELL_KNOWN_PREFLIGHT_HEADERS,
} from "@/utilities/wellKnown";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * RFC 9728 OAuth Protected Resource Metadata at the apex.
 *
 * Served directly from gap-app-v2 rather than proxying gap-indexer's
 * canonical endpoint. Rationale: the document is essentially static
 * config (resource URL + authorization server URL + scopes + signing
 * algs) — no per-request data — so the upstream round-trip is wasted
 * cost. Previously we proxied, but the gap-indexer route silently
 * 404'd in production (registration failed to take effect post-deploy)
 * and fired a Sentry alert on every probe.
 *
 * Authorization server URL is sourced from NEXT_PUBLIC_GAP_OAUTH_URL.
 * Resource URL is the MCP endpoint on the indexer.
 */

export function GET() {
  const issuer = envVars.NEXT_PUBLIC_GAP_OAUTH_URL;
  if (!issuer || issuer.trim() === "") {
    // Capture explicitly so Sentry alerts carry the route tag. The
    // default unhandled-error capture wouldn't — and we'd lose the
    // operational visibility the previous proxy route had via its
    // upstream Sentry.captureException calls. With `force-static`
    // this also surfaces a misconfigured env var at build time.
    const err = new Error(
      "NEXT_PUBLIC_GAP_OAUTH_URL is not set. Required for /.well-known/oauth-protected-resource."
    );
    Sentry.captureException(err, {
      tags: { route: "well-known/oauth-protected-resource" },
    });
    throw err;
  }
  const resource = `${getIndexerBaseUrl()}/v2/mcp`;

  const body = {
    resource,
    authorization_servers: [issuer],
    scopes_supported: ["mcp"],
    bearer_methods_supported: ["header"],
    resource_signing_alg_values_supported: ["RS256"],
    resource_documentation: `${issuer}/.well-known/oauth-authorization-server`,
  };

  return NextResponse.json(body, { headers: WELL_KNOWN_CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: WELL_KNOWN_PREFLIGHT_HEADERS });
}
