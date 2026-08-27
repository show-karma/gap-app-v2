import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Same-origin proxy in front of Mixpanel's ingestion API.
 *
 * Tracker-blocking extensions and DNS-level blocklists drop requests to
 * `api.mixpanel.com` outright, which silently deletes a large share of events —
 * the loss is invisible in the dashboard because the events never arrive.
 * `utilities/analytics/client.ts` points the SDK's `api_host` at this route
 * (see `MIXPANEL_PROXY_PATH`), so the browser only ever talks to our own origin.
 *
 * Because the request now originates from the server, Mixpanel would geolocate
 * every event to the datacentre. `X-REAL-IP` plus `?ip=1` carry the real client
 * IP so geo enrichment stays correct.
 *
 * This is a fixed-origin, POST-only, token-pinned forwarder, not a general
 * proxy. An open forwarder to `api.mixpanel.com` would let anyone on the
 * internet write events into someone else's Mixpanel project through our
 * origin, so every request has to prove it carries *our* project token.
 *
 * REVIEW-WAIVED: rate limiting follows in a separate PR (needs Redis)
 */

const MIXPANEL_API_ORIGIN = "https://api.mixpanel.com";

/**
 * Ingestion endpoints the browser SDK calls. `decide` (feature flags) and
 * `record` (session replay) are deliberately absent: the client disables both,
 * so reaching them through this route would mean something other than our SDK
 * is calling it.
 */
const ALLOWED_PATHS = new Set(["track", "engage", "groups"]);

const ALLOWED_CONTENT_TYPES = ["application/x-www-form-urlencoded", "application/json"];

/**
 * Mixpanel's own per-request limit is well under this; the cap is here to stop
 * an unbounded body being buffered into the route worker's memory.
 */
const MAX_BODY_BYTES = 256 * 1024;

// Mixpanel ingestion is fast; a hung upstream must not pin the route worker.
const UPSTREAM_TIMEOUT_MS = 10_000;

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
// Deliberately permissive: this value is only ever forwarded to Mixpanel as a
// geolocation hint, so the check exists to reject header injection and
// free-text, not to validate every RFC 4291 form.
const IPV6 = /^[0-9a-fA-F:]{2,45}$/;

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

/** Joins the catch-all segments back into the upstream path. */
const resolveUpstreamPath = (segments: string[] | undefined): string | null => {
  const joined = (segments ?? []).join("/");
  return ALLOWED_PATHS.has(joined) ? joined : null;
};

const isIpAddress = (value: string): boolean => {
  const v4 = value.match(IPV4);
  if (v4) return v4.slice(1).every((octet) => Number(octet) <= 255);
  return value.includes(":") && IPV6.test(value);
};

/**
 * The client's own IP, so Mixpanel geolocates the visitor and not the server.
 *
 * `x-real-ip` is set by the hosting platform and cannot be spoofed by the
 * caller. `x-forwarded-for` can be — a client may prepend entries — so only the
 * RIGHTMOST entry (the one the closest trusted proxy appended) is used.
 *
 * REVIEW-WAIVED: route handlers have no request.ip; header read is validated
 * and limited to x-real-ip / rightmost XFF
 */
const clientIp = (request: NextRequest): string | null => {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && isIpAddress(realIp)) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return null;
  const entries = forwarded.split(",");
  const rightmost = entries[entries.length - 1].trim();
  return isIpAddress(rightmost) ? rightmost : null;
};

/**
 * Recovers the JSON payload the SDK sent. `mixpanel-browser` posts either
 * `data=<base64 JSON>` or `data=<JSON>` as a form field, depending on
 * `api_payload_format`; a bare JSON body is also accepted.
 */
const decodePayload = (body: string, contentType: string): unknown => {
  const raw = contentType.includes("application/json")
    ? body
    : (new URLSearchParams(body).get("data") ?? "");
  if (!raw) return null;

  const candidates = [raw];
  try {
    candidates.push(Buffer.from(raw, "base64").toString("utf-8"));
  } catch {
    // SUPPRESSED: a payload that is not base64 is simply not the base64 form;
    // the plain-JSON candidate below still gets its chance.
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // SUPPRESSED: try the next encoding before giving up.
    }
  }
  return null;
};

const recordsOf = (payload: unknown): Record<string, unknown>[] | null => {
  if (Array.isArray(payload)) {
    return payload.every((entry) => typeof entry === "object" && entry !== null)
      ? (payload as Record<string, unknown>[])
      : null;
  }
  if (typeof payload === "object" && payload !== null) return [payload as Record<string, unknown>];
  return null;
};

/**
 * `track` carries the project token inside `properties`; `engage` and `groups`
 * carry it as a top-level `$token`.
 */
const tokenOf = (record: Record<string, unknown>, upstreamPath: string): unknown => {
  if (upstreamPath === "track") {
    const properties = record.properties;
    return typeof properties === "object" && properties !== null
      ? (properties as Record<string, unknown>).token
      : undefined;
  }
  return record.$token;
};

/** Every record must belong to this deployment's Mixpanel project. */
const carriesOurToken = (body: string, contentType: string, upstreamPath: string): boolean => {
  const expected = process.env.NEXT_PUBLIC_MIXPANEL_KEY;
  if (!expected) return false;

  const records = recordsOf(decodePayload(body, contentType));
  if (!records || records.length === 0) return false;

  return records.every((record) => tokenOf(record, upstreamPath) === expected);
};

const reject = (status: number, error: string) =>
  NextResponse.json({ error }, { status, headers: NO_STORE });

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const upstreamPath = resolveUpstreamPath(path);
  if (!upstreamPath) return reject(404, "Path not allowed");

  const contentType = request.headers.get("content-type") ?? "";
  if (!ALLOWED_CONTENT_TYPES.some((allowed) => contentType.includes(allowed))) {
    return reject(415, "Unsupported content type");
  }

  const body = await request.text();
  if (Buffer.byteLength(body, "utf-8") > MAX_BODY_BYTES) {
    return reject(413, "Payload too large");
  }

  if (!carriesOurToken(body, contentType, upstreamPath)) {
    return reject(403, "Payload rejected");
  }

  // `ip=1` tells Mixpanel to geolocate from the request rather than from the
  // payload, which is what makes the X-REAL-IP header below take effect.
  const { searchParams } = new URL(request.url);
  searchParams.set("ip", "1");
  const upstreamUrl = `${MIXPANEL_API_ORIGIN}/${upstreamPath}?${searchParams.toString()}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": contentType,
  };
  const ip = clientIp(request);
  if (ip) headers["X-REAL-IP"] = ip;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const payload = await upstream.text();
    return new NextResponse(payload, {
      status: upstream.status,
      headers: {
        ...NO_STORE,
        "Content-Type": upstream.headers.get("content-type") ?? "text/plain",
      },
    });
  } catch (error) {
    // Reported because this branch means the server itself could not reach
    // Mixpanel (DNS, TLS, timeout) — an infrastructure problem worth an alert,
    // unlike an upstream 4xx which is passed through above.
    Sentry.captureException(error, { tags: { route: "api/mp", mixpanel_path: upstreamPath } });
    return reject(502, "Upstream unavailable");
  }
}
