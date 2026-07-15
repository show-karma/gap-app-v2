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
 * trusted.
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
      if (hasExactKeys(record, ["outcome", "url"]) && typeof url === "string") {
        return { outcome, url };
      }
      return null;
    }
    case "duplicate-alias": {
      const url = record.url;
      const canonicalUrl = record.canonicalUrl;
      if (
        hasExactKeys(record, ["outcome", "url", "canonicalUrl"]) &&
        typeof url === "string" &&
        typeof canonicalUrl === "string"
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
        typeof from === "string" &&
        typeof to === "string"
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
