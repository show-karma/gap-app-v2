/**
 * Pure, framework-free (Edge-safe) client for the project indexability decision.
 * No Node/Next imports — only the sibling path helpers, globalThis.fetch,
 * AbortController, and timers — so it runs on the Edge runtime as well as in
 * server/metadata code. It is strict on the wire and fails closed: any failure
 * degrades to noindex,follow at the request's normalized path (ADR 0001, D5/D9).
 *
 * Amendment to that fail-closed rule: a transient indexer blip must not
 * de-index a page that was just known to be indexable, so a failed lookup
 * first replays the last successful decision for the same endpoint when one is
 * less than PROJECT_INDEXABILITY_LKG_TTL_MS old. Fail-closed remains the
 * behavior whenever no fresh-enough decision is known. The cache is per runtime
 * instance (see project-indexability-lkg-cache.ts) — it covers warm instances
 * only, so a cold instance during an outage still fails closed.
 */
import {
  buildProjectIndexabilityEndpoint,
  type ProjectIndexabilityRequest,
} from "./project-indexability";
import {
  createProjectIndexabilityLkgCache,
  type ProjectIndexabilityLkgCache,
} from "./project-indexability-lkg-cache";

/** The exact indexability decision union returned by the backend. */
export type ProjectIndexabilityDecision =
  | { outcome: "canonical-indexable"; url: string }
  | { outcome: "duplicate-alias"; url: string; canonicalUrl: string }
  | { outcome: "noindex-follow"; url: string }
  | { outcome: "redirect"; from: string; to: string }
  | { outcome: "gone"; status: 404 | 410 };

type ProjectIndexabilityFetcher = (url: string, init: RequestInit) => Promise<Response>;

interface FetchProjectIndexabilityOptions {
  baseUrl: string;
  fetcher?: ProjectIndexabilityFetcher;
  timeoutMs?: number;
  /** Overridable last-known-good store; defaults to the module-level cache. */
  lkgCache?: ProjectIndexabilityLkgCache<ProjectIndexabilityDecision>;
}

const DEFAULT_TIMEOUT_MS = 2500;

/**
 * How long a successful decision may be replayed after a failed lookup. Kept
 * deliberately short: serving a stale "indexable" indefinitely is not
 * acceptable, but indexer blips last seconds to minutes, which this covers.
 */
export const PROJECT_INDEXABILITY_LKG_TTL_MS = 5 * 60 * 1000;

/** Bounds instance memory; entries are one small decision object each. */
const PROJECT_INDEXABILITY_LKG_MAX_ENTRIES = 500;

const projectIndexabilityLkgCache = createProjectIndexabilityLkgCache<ProjectIndexabilityDecision>({
  ttlMs: PROJECT_INDEXABILITY_LKG_TTL_MS,
  maxEntries: PROJECT_INDEXABILITY_LKG_MAX_ENTRIES,
});

/** Drop every remembered decision (operational reset; test isolation). */
export function clearProjectIndexabilityLkgCache(): void {
  projectIndexabilityLkgCache.clear();
}

/**
 * Strictly parse an unknown value into a ProjectIndexabilityDecision, or null.
 * Every member must match exactly — the correct outcome, correctly-typed fields,
 * and no extra keys — so a malformed or partial payload is rejected rather than
 * trusted. Every URL field is additionally validated as a local `/project/...`
 * path so a hostile payload cannot drive a cross-origin redirect.
 */
export function parseProjectIndexabilityDecision(
  value: unknown
): ProjectIndexabilityDecision | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const outcome = record.outcome;

  switch (outcome) {
    case "canonical-indexable":
    case "noindex-follow": {
      const url = record.url;
      if (hasExactKeys(record, ["outcome", "url"]) && isLocalProjectPath(url)) {
        return { outcome, url };
      }
      return null;
    }
    case "duplicate-alias": {
      const url = record.url;
      const canonicalUrl = record.canonicalUrl;
      if (
        hasExactKeys(record, ["outcome", "url", "canonicalUrl"]) &&
        isLocalProjectPath(url) &&
        isLocalProjectPath(canonicalUrl)
      ) {
        return { outcome, url, canonicalUrl };
      }
      return null;
    }
    case "redirect": {
      const from = record.from;
      const to = record.to;
      if (
        hasExactKeys(record, ["outcome", "from", "to"]) &&
        isLocalProjectPath(from) &&
        isLocalProjectPath(to)
      ) {
        return { outcome, from, to };
      }
      return null;
    }
    case "gone": {
      const status = record.status;
      if (hasExactKeys(record, ["outcome", "status"]) && (status === 404 || status === 410)) {
        return { outcome, status };
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Fetch the authoritative indexability decision for a parsed request. HTTP
 * 404/410 map directly to `gone`; a valid 200 body is strictly parsed and
 * remembered as the endpoint's last-known-good decision. Every other case —
 * 5xx, invalid JSON/shape, network error, or timeout/abort — replays that
 * remembered decision while it is younger than PROJECT_INDEXABILITY_LKG_TTL_MS,
 * and otherwise fails closed to noindex,follow at normalizedPath. A missing
 * baseUrl is a config error, not a blip, so it fails closed without consulting
 * the cache.
 *
 * `gone` is never remembered and never overridden by the cache: it is a
 * definitive fresh answer, so in either of its forms — an HTTP 404/410 or a 200
 * body saying `gone` — it invalidates whatever was remembered for the endpoint.
 * A removed route can then neither be resurrected as indexable from memory nor
 * keep answering 404/410 once the indexer stops saying so.
 *
 * The lookup is stamped with the cache's clock *before* the request goes out,
 * so a slow response cannot overwrite a decision observed after it started.
 */
export async function fetchProjectIndexabilityDecision(
  parsed: ProjectIndexabilityRequest,
  options: FetchProjectIndexabilityOptions
): Promise<ProjectIndexabilityDecision> {
  const failClosed: ProjectIndexabilityDecision = {
    outcome: "noindex-follow",
    url: parsed.normalizedPath,
  };

  const baseUrl = options.baseUrl.trim();
  if (!baseUrl) {
    return failClosed;
  }

  const fetcher: ProjectIndexabilityFetcher = options.fetcher ?? globalThis.fetch;
  const timeoutMs =
    typeof options.timeoutMs === "number" &&
    Number.isFinite(options.timeoutMs) &&
    options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_TIMEOUT_MS;

  const endpoint = buildProjectIndexabilityEndpoint(baseUrl, parsed);
  const lkgCache = options.lkgCache ?? projectIndexabilityLkgCache;
  // The endpoint already encodes identifier + route + grantUid, so it is the
  // cache key. Every remembered decision was validated by the parser, so a
  // replay can never introduce an unvalidated redirect target.
  const lastKnownGood = (): ProjectIndexabilityDecision => lkgCache.get(endpoint) ?? failClosed;
  // Stamped before the request is issued: the decision describes the endpoint as
  // of this moment, and ordering writes by it keeps a delayed response from
  // overwriting one observed later.
  const observedAt = lkgCache.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (response.status === 404 || response.status === 410) {
      lkgCache.invalidate(endpoint, observedAt);
      return { outcome: "gone", status: response.status };
    }

    if (response.status !== 200) {
      return lastKnownGood();
    }

    const body: unknown = await response.json();
    const decision = parseProjectIndexabilityDecision(body);
    if (!decision) {
      return lastKnownGood();
    }
    if (decision.outcome === "gone") {
      lkgCache.invalidate(endpoint, observedAt);
    } else {
      lkgCache.set(endpoint, decision, observedAt);
    }
    return decision;
  } catch {
    return lastKnownGood();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function hasExactKeys(record: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(record).length === keys.length && keys.every((key) => key in record);
}

const PROJECT_PATH_PREFIX = "/project/";
const MAX_CONTROL_CHAR_CODE = 0x20; // space and everything below (tab, CR, LF, NUL)
const DEL_CHAR_CODE = 0x7f;

/**
 * Every URL field in a decision (`url`, `canonicalUrl`, `from`, `to`) is a
 * redirect/canonical target the middleware concatenates with an origin, so it
 * must be a root-relative path into a `/project/...` route and nothing else.
 * Reject anything that could yield a cross-origin URL: an absolute or
 * protocol-relative form (`//host`), userinfo (`@host`), a query or fragment
 * (`?` / `#`), a backslash (the URL parser folds `\` to `/`), or any embedded
 * whitespace/control character. Fails closed for non-strings.
 */
function isLocalProjectPath(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  if (!value.startsWith(PROJECT_PATH_PREFIX) || value.length === PROJECT_PATH_PREFIX.length) {
    return false;
  }
  if (
    value.includes("//") ||
    value.includes("@") ||
    value.includes("?") ||
    value.includes("#") ||
    value.includes("\\")
  ) {
    return false;
  }
  // Reject any ASCII control char, space, or DEL — blocks tab/newline URL
  // smuggling — using char codes so no literal control byte lives in source.
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= MAX_CONTROL_CHAR_CODE || code === DEL_CHAR_CODE) {
      return false;
    }
  }
  // The `/project/` prefix alone is not enough: a dot-segment lets the value
  // escape the route once the middleware resolves it against an origin — e.g.
  // `new URL("<origin>/project/x/../../evil")` normalizes to "<origin>/evil".
  // Validate every segment so no traversal (literal or percent-encoded) or
  // encoded separator survives.
  const segments = value.split("/");
  for (let index = 1; index < segments.length; index += 1) {
    if (!isSafeProjectPathSegment(segments[index])) {
      return false;
    }
  }
  return true;
}

/**
 * A path segment is safe when it is non-empty, is not a literal or
 * percent-encoded dot-segment ("." / ".." / "%2e%2e"), decodes cleanly (a
 * malformed escape throws), and carries no encoded path separator once decoded
 * ("%2F" -> "/", "%5C" -> "\"). Guards against traversal that only appears
 * after the URL parser resolves the value.
 */
function isSafeProjectPathSegment(segment: string): boolean {
  if (segment.length === 0 || segment === "." || segment === "..") {
    return false;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return false;
  }
  if (decoded === "." || decoded === "..") {
    return false;
  }
  return !decoded.includes("/") && !decoded.includes("\\");
}
