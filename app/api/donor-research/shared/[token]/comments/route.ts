import { cookies, headers as nextHeaders } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { envVars } from "@/utilities/enviromentVars";

/**
 * Next.js API-route proxy for the donor-shared report comment endpoints
 * (KTD13 in the shared-report-commenting plan). Forwards GET + POST to
 * the gap-indexer server-to-server and translates cookies between the
 * indexer's origin and the FE origin.
 *
 *   FE origin (gap.karmahq.xyz):          cookie scope /api/donor-research/shared/
 *   Indexer origin (gap-indexer.karmahq.xyz): cookie scope /v2/donor-research/shared/
 *
 * The indexer's controller sets cookies on its origin; we re-issue them
 * on the FE origin so the browser sends them on subsequent same-origin
 * proxy calls. The donor's IP is forwarded via x-forwarded-for so the
 * indexer's per-IP rate limit stays accurate.
 *
 * Security posture preserved:
 *   - drsc_session stays HttpOnly + SameSite=Lax on the FE origin
 *   - drsc_name stays JS-readable (HttpOnly=false) for the
 *     "Commenting as X" affordance
 *   - x-drsc-session carries the cookie value to the indexer as a
 *     server-only header; the cookie never leaves the FE origin in the
 *     browser's view
 */

const COOKIE_SESSION = "drsc_session";
const COOKIE_NAME = "drsc_name";
// drsc_session is HttpOnly and only needs to reach the proxy, so it stays
// scoped to the proxy path. drsc_name is the JS-readable "Commenting as X"
// cookie the SHARED PAGE (/nonprofit-research/shared/...) reads via
// document.cookie — it must live at root path "/" or the page can't see it
// (the proxy path is not a prefix of the page path), which would force the
// identity dialog on every comment.
const FE_COOKIE_PATH = "/api/donor-research/shared/";
const FE_NAME_COOKIE_PATH = "/";

// Bound the server-to-server proxy call so a hung indexer can't pin the
// Next.js route worker indefinitely — abort and surface a 502 instead.
const UPSTREAM_TIMEOUT_MS = 15_000;

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
} as const;

function indexerUrl(token: string, query?: URLSearchParams): string {
  const base = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/donor-research/shared/${encodeURIComponent(token)}/comments`;
  return query && Array.from(query).length > 0 ? `${base}?${query.toString()}` : base;
}

async function extractClientIp(): Promise<string | null> {
  const h = await nextHeaders();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip");
}

async function buildForwardHeaders(token: string, contentType?: string): Promise<HeadersInit> {
  const ip = await extractClientIp();
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_SESSION)?.value ?? "";
  const h = await nextHeaders();
  const out: Record<string, string> = {
    Accept: "application/json",
  };
  if (contentType) out["Content-Type"] = contentType;
  if (ip) out["x-forwarded-for"] = ip;
  if (sessionCookie) out["x-drsc-session"] = sessionCookie;
  // Pass-through standard Origin for the indexer's CSRF posture
  const origin = h.get("origin");
  if (origin) out["Origin"] = origin;
  // Pass-through Idempotency-Key for write requests
  const idem = h.get("idempotency-key");
  if (idem) out["Idempotency-Key"] = idem;
  // Forward the Privy JWT (KTD13 / KTD14). The indexer's
  // `optionalAuthentication` reads this header to resolve the advisor
  // identity branch on writes. Anonymous donors never carry one and
  // pass through unchanged.
  const authz = h.get("authorization");
  if (authz) out["Authorization"] = authz;
  return out;
}

function copySetCookies(upstream: Response, next: NextResponse, isProd: boolean): void {
  // Re-issue every Set-Cookie from the indexer on the FE origin with a
  // path scoped to the proxy. The indexer issues drsc_session
  // (HttpOnly) and drsc_name (HttpOnly=false). We preserve those
  // distinctions explicitly.
  const setCookieList = upstream.headers.getSetCookie?.() ?? [];
  for (const raw of setCookieList) {
    const [pair] = raw.split(";", 1);
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const name = pair.slice(0, idx);
    const rawValue = pair.slice(idx + 1);
    // Guard decoding: a malformed percent-sequence from upstream would
    // otherwise throw and 500 the whole proxy response. Fall back to the
    // raw value (re-encoded on set) rather than failing the request.
    let value: string;
    try {
      value = decodeURIComponent(rawValue);
    } catch {
      value = rawValue;
    }
    if (name === COOKIE_SESSION) {
      next.cookies.set(COOKIE_SESSION, value, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        path: FE_COOKIE_PATH,
        maxAge: 7 * 24 * 60 * 60,
      });
    } else if (name === COOKIE_NAME) {
      next.cookies.set(COOKIE_NAME, value, {
        httpOnly: false,
        sameSite: "lax",
        secure: isProd,
        path: FE_NAME_COOKIE_PATH,
        maxAge: 7 * 24 * 60 * 60,
      });
    }
  }
}

function applyNoStore(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(NO_STORE)) res.headers.set(k, v);
  return res;
}

interface Params {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, ctx: Params): Promise<NextResponse> {
  const { token } = await ctx.params;
  const { searchParams } = new URL(request.url);

  const forwardHeaders = await buildForwardHeaders(token);
  let upstream: Response;
  try {
    upstream = await fetch(indexerUrl(token, searchParams), {
      method: "GET",
      headers: forwardHeaders,
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return applyNoStore(NextResponse.json({ error: "indexer_unreachable" }, { status: 502 }));
  }

  const body = await upstream.json().catch(() => ({}));
  const next = NextResponse.json(body, { status: upstream.status });
  copySetCookies(upstream, next, process.env.NODE_ENV === "production");
  return applyNoStore(next);
}

export async function POST(request: NextRequest, ctx: Params): Promise<NextResponse> {
  const { token } = await ctx.params;
  const rawBody = await request.text();

  const forwardHeaders = await buildForwardHeaders(token, "application/json");
  let upstream: Response;
  try {
    upstream = await fetch(indexerUrl(token), {
      method: "POST",
      headers: forwardHeaders,
      body: rawBody,
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return applyNoStore(NextResponse.json({ error: "indexer_unreachable" }, { status: 502 }));
  }

  const body = await upstream.json().catch(() => ({}));
  const next = NextResponse.json(body, { status: upstream.status });
  copySetCookies(upstream, next, process.env.NODE_ENV === "production");
  return applyNoStore(next);
}
