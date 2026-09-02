import { isIP } from "node:net";
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
 * What upstream receives is a re-encoding of the payload this route decoded and
 * validated — never the caller's original bytes. Forwarding the original would
 * reopen the whole class of parser-differential attacks: a body that this
 * route reads as one thing and Mixpanel reads as another.
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

/** Exact media types, compared after stripping parameters. */
const ALLOWED_MEDIA_TYPES = new Set(["application/x-www-form-urlencoded", "application/json"]);

const FORM_MEDIA_TYPE = "application/x-www-form-urlencoded";

/**
 * Mixpanel's own per-request limit is well under this. The cap is enforced
 * while reading rather than after, so an oversized body is abandoned mid-stream
 * instead of being buffered into the route worker's memory first.
 */
const MAX_BODY_BYTES = 256 * 1024;

// Mixpanel ingestion is fast; a hung upstream must not pin the route worker.
const UPSTREAM_TIMEOUT_MS = 10_000;

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

/** Joins the catch-all segments back into the upstream path. */
const resolveUpstreamPath = (segments: string[] | undefined): string | null => {
  const joined = (segments ?? []).join("/");
  return ALLOWED_PATHS.has(joined) ? joined : null;
};

/** `application/json; charset=utf-8` -> `application/json`. */
const mediaTypeOf = (contentType: string | null): string =>
  (contentType ?? "").split(";")[0].trim().toLowerCase();

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
  if (realIp && isIP(realIp) !== 0) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return null;
  const entries = forwarded.split(",");
  const rightmost = entries[entries.length - 1].trim();
  return isIP(rightmost) !== 0 ? rightmost : null;
};

/**
 * Reads the body, abandoning it the moment it exceeds the cap. Returns null
 * when the cap was hit, so the caller can answer 413 without ever having held
 * the whole payload.
 */
async function readBodyWithinCap(request: NextRequest): Promise<string | null> {
  const stream = request.body;
  if (!stream) return "";

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // SUPPRESSED: releasing a lock on a cancelled reader throws in some
      // runtimes. The body is already fully handled either way.
    }
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

type PayloadResult =
  | { ok: true; payload: unknown }
  | { ok: false; status: 400 | 403; error: string };

const MALFORMED: PayloadResult = { ok: false, status: 400, error: "Malformed payload" };
const REJECTED: PayloadResult = { ok: false, status: 403, error: "Payload rejected" };

/**
 * Recovers the JSON payload the SDK sent. `mixpanel-browser` posts either
 * `data=<base64 JSON>` or `data=<JSON>` as a form field, depending on
 * `api_payload_format`.
 *
 * A form body must carry EXACTLY one `data` field. Two is not a browser SDK —
 * it is someone hoping this route reads the first and Mixpanel reads the last.
 */
const decodePayload = (body: string, mediaType: string): PayloadResult => {
  let raw = body;

  if (mediaType === FORM_MEDIA_TYPE) {
    const values = new URLSearchParams(body).getAll("data");
    if (values.length !== 1) return MALFORMED;
    raw = values[0];
  }

  if (!raw) return MALFORMED;

  const candidates = [raw];
  try {
    candidates.push(Buffer.from(raw, "base64").toString("utf-8"));
  } catch {
    // SUPPRESSED: a payload that is not base64 is simply not the base64 form;
    // the plain-JSON candidate below still gets its chance.
  }

  for (const candidate of candidates) {
    try {
      return { ok: true, payload: JSON.parse(candidate) };
    } catch {
      // SUPPRESSED: try the next encoding before giving up.
    }
  }
  return MALFORMED;
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

/** Decodes the body and proves every record belongs to this deployment. */
function validatePayload(body: string, mediaType: string, upstreamPath: string): PayloadResult {
  const decoded = decodePayload(body, mediaType);
  if (!decoded.ok) return decoded;

  const records = recordsOf(decoded.payload);
  if (!records) return MALFORMED;
  // An empty batch is nothing to forward — malformed, not unauthorised.
  if (records.length === 0) return MALFORMED;

  const expected = process.env.NEXT_PUBLIC_MIXPANEL_KEY;
  if (!expected) return REJECTED;
  if (!records.every((record) => tokenOf(record, upstreamPath) === expected)) return REJECTED;

  return decoded;
}

/**
 * Re-serialises exactly what was validated, so upstream cannot read the body
 * differently from this route.
 */
const canonicalBody = (payload: unknown, mediaType: string): string => {
  const json = JSON.stringify(payload);
  if (mediaType !== FORM_MEDIA_TYPE) return json;
  return new URLSearchParams({
    data: Buffer.from(json, "utf-8").toString("base64"),
  }).toString();
};

const reject = (status: number, error: string) =>
  NextResponse.json({ error }, { status, headers: NO_STORE });

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const upstreamPath = resolveUpstreamPath(path);
  if (!upstreamPath) return reject(404, "Path not allowed");

  const mediaType = mediaTypeOf(request.headers.get("content-type"));
  if (!ALLOWED_MEDIA_TYPES.has(mediaType)) {
    return reject(415, "Unsupported content type");
  }

  // Declared length first: a caller that announces an oversized body is
  // refused without reading a byte of it.
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return reject(413, "Payload too large");
  }

  const body = await readBodyWithinCap(request);
  if (body === null) return reject(413, "Payload too large");

  const validated = validatePayload(body, mediaType, upstreamPath);
  if (!validated.ok) return reject(validated.status, validated.error);

  // `ip=1` tells Mixpanel to geolocate from the request rather than from the
  // payload, which is what makes the X-REAL-IP header below take effect.
  const { searchParams } = new URL(request.url);
  searchParams.set("ip", "1");
  const upstreamUrl = `${MIXPANEL_API_ORIGIN}/${upstreamPath}?${searchParams.toString()}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": mediaType,
  };
  const ip = clientIp(request);
  if (ip) headers["X-REAL-IP"] = ip;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: canonicalBody(validated.payload, mediaType),
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
