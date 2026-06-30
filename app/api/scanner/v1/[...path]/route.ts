import * as Sentry from "@sentry/nextjs";
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

// Upstream timeout for the proxied call. Generous enough for the slowest
// scanner endpoints, short enough that a stuck connection surfaces as a
// 504 instead of pinning the route.
const UPSTREAM_TIMEOUT_MS = 30_000;

// Hop-by-hop headers that must not be forwarded blindly (per RFC 7230 §6.1).
// content-encoding/content-length are stripped because Node's fetch()
// transparently decompresses upstream gzip/br bodies — forwarding the
// upstream encoding header on the decompressed body triggers
// ERR_CONTENT_DECODING_FAILED in the browser.
//
// x-forwarded-*, x-real-ip, forwarded, true-client-ip, cf-connecting-ip
// are stripped from the browser-supplied request and re-derived from
// the inbound socket peer. The proxy sits at the public edge of the
// FE app; a browser can put any value in those headers when posting
// to /api/scanner/v1/scans, and forwarding the value verbatim would
// let an attacker spoof the anonymous-rate-limit key in gap-indexer.
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

const CALLER_SUPPLIED_FORWARDING_HEADERS = [
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
  "x-real-ip",
  "forwarded",
  "true-client-ip",
  "cf-connecting-ip",
  "fastly-client-ip",
];

// Pick the leftmost public address from a trusted x-forwarded-for chain.
// Used only when Next.js is itself behind a known platform proxy
// (Vercel sets x-vercel-forwarded-for + x-forwarded-for); in plain
// localhost dev, both are absent and the chain is empty.
function trustedClientIp(req: NextRequest): string | null {
  // Vercel's platform header is set by their edge and not exposed to
  // user agents — trust it when present.
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }
  return null;
}

function buildForwardHeaders(req: NextRequest): Headers {
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (HOP_BY_HOP.has(k)) return;
    if (CALLER_SUPPLIED_FORWARDING_HEADERS.includes(k)) return;
    headers.set(key, value);
  });
  // Only set X-Forwarded-For from a header we trust the platform set.
  // In local dev nothing is set, and gap-indexer falls back to
  // request.ip (its own socket peer). Either way, browser-supplied
  // values never reach the BE rate-limit key.
  const trusted = trustedClientIp(req);
  if (trusted) {
    headers.set("x-forwarded-for", trusted);
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
  const segments = path ?? [];
  // Reject path segments that could let new URL() normalize the request
  // out of the /api/scanner/v1/ prefix (e.g. "..", encoded slashes).
  // encodeURIComponent below would catch most of these, but layered
  // defense keeps the surface small: any segment that does not look
  // like a normal URL path token is dropped at the door.
  for (const seg of segments) {
    if (!seg || seg === "." || seg === ".." || seg.includes("/") || seg.includes("\\")) {
      return new Response("Bad Request", { status: 400 });
    }
  }
  const targetPath = `/api/scanner/v1/${segments.map(encodeURIComponent).join("/")}`;
  const targetUrl = new URL(`${BACKEND_BASE}${targetPath}`);
  // Defense-in-depth: refuse the request if the constructed URL is not
  // under the scanner prefix. Catches any future bypass that slips
  // through the segment check above.
  if (!targetUrl.pathname.startsWith("/api/scanner/v1/")) {
    return new Response("Bad Request", { status: 400 });
  }
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

  // Bound the upstream call so a hung gap-indexer doesn't pin the Node
  // route until the platform's own (much longer) timeout fires. On abort
  // or transport failure, return a controlled gateway error and report it
  // server-side rather than letting it bubble as an opaque 500.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(targetUrl.toString(), { ...init, signal: controller.signal });
    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: buildForwardResponseHeaders(upstream),
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    Sentry.captureException(error, {
      tags: { route: "/api/scanner/v1/[...path]", method: req.method },
      extra: { targetPath },
    });
    return new Response(aborted ? "Gateway Timeout" : "Bad Gateway", {
      status: aborted ? 504 : 502,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
