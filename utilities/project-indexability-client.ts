/**
 * Pure, framework-free (Edge-safe) client for the project indexability decision.
 * No Node/Next imports — only the sibling path helper, globalThis.fetch,
 * AbortController, and timers — so it runs on the Edge runtime as well as in
 * server/metadata code. It is strict on the wire and fails closed: any failure
 * degrades to noindex,follow at the request's normalized path (ADR 0001, D5/D9).
 */
import {
  buildProjectIndexabilityEndpoint,
  type ProjectIndexabilityRequest,
} from "./project-indexability";

/** The exact indexability decision union returned by the backend. */
type ProjectIndexabilityDecision =
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
}

const DEFAULT_TIMEOUT_MS = 2500;

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
 * 404/410 map directly to `gone`; a valid 200 body is strictly parsed; every
 * other case — missing baseUrl, 5xx, invalid JSON/shape, network error, or
 * timeout/abort — silently fails closed to noindex,follow at normalizedPath.
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (response.status === 404 || response.status === 410) {
      return { outcome: "gone", status: response.status };
    }

    if (response.status !== 200) {
      return failClosed;
    }

    const body: unknown = await response.json();
    return parseProjectIndexabilityDecision(body) ?? failClosed;
  } catch {
    return failClosed;
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
