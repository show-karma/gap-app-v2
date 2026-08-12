import { isApiError } from "@/utilities/api/errors";

/**
 * Rethrows a failed payout-config fetch. A typed `ApiError` (issue #1775) is
 * re-thrown as-is so React Query's retry policy can still see the HTTP status —
 * a public-endpoint 429 stays `retryable` and gets the bounded Retry-After
 * backoff instead of collapsing to the legacy single-retry path when the burst
 * of per-grant requests on the milestone-report page trips the rate limit.
 * Non-API failures keep a caller-friendly wrapped message. See GAP-FRONTEND-245.
 */
export function rethrowFetchError(error: unknown, prefix: string): never {
  if (isApiError(error)) throw error;
  const detail = error instanceof Error ? error.message : String(error);
  throw new Error(`${prefix}: ${detail}`);
}
