import type { NextRequest } from "next/server";
import { envVars } from "@/utilities/enviromentVars";

// Same-origin proxy for /api/scanner/v1/*. The browser fetches cross-origin
// requests without cookies by default, so the FE cannot call the gap-indexer
// scanner endpoints directly and have the Privy session reach the BE
// identity middleware. This route handler forwards every method/header/body
// to the BE under the same path, keeping the Privy session cookie in the
// hop and stripping the cross-origin problem.
//
// Per CLAUDE.md cross-service guardrails: "A cookie set on one origin will
// not arrive on a different origin — it has to be forwarded as a header by
// the proxy." That is exactly this proxy.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_BASE = envVars.NEXT_PUBLIC_GAP_INDEXER_URL.replace(/\/$/, "");

// Hop-by-hop headers that must not be forwarded blindly (per RFC 7230 §6.1).
// content-encoding/content-length are stripped because Node's fetch()
// transparently decompresses upstream gzip/br bodies — forwarding the
// upstream encoding header on the decompressed body triggers
// ERR_CONTENT_DECODING_FAILED in the browser.
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "content-encoding",
]);

function buildForwardHeaders(req: NextRequest): Headers {
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  // X-Forwarded-* let the BE see the original caller for rate-limit keys.
  const forwardedFor = req.headers.get("x-forwarded-for");
  const clientIp = req.headers.get("x-real-ip");
  if (forwardedFor) {
    headers.set("x-forwarded-for", forwardedFor);
  } else if (clientIp) {
    headers.set("x-forwarded-for", clientIp);
  }
  return headers;
}

function buildForwardResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await context.params;
  const targetPath = `/api/scanner/v1/${(path ?? []).map(encodeURIComponent).join("/")}`;
  const targetUrl = new URL(`${BACKEND_BASE}${targetPath}`);
  // Preserve query string verbatim.
  req.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  const init: RequestInit = {
    method: req.method,
    headers: buildForwardHeaders(req),
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = await req.arrayBuffer();
    if (body.byteLength > 0) init.body = body;
  }

  const upstream = await fetch(targetUrl.toString(), init);
  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: buildForwardResponseHeaders(upstream),
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
