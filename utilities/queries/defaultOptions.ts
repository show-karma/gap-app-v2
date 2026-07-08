import { isAxiosAbortError, isTransientNetworkError } from "@/utilities/sentry/transientErrors";

const RATE_LIMIT_MAX_RETRIES = 2;
const RATE_LIMIT_BACKOFF_CAP_MS = 30_000;

/**
 * Smart retry function:
 * - Never retry auth failures (401)
 * - Never retry user-cancelled requests (route change / abort)
 * - Allow up to 2 retries for rate limits (429). Under the indexer's
 *   30 req/min/IP per-route cap, a page that fans out many requests bursts
 *   past the cap; a short capped backoff lets the window drain instead of
 *   surfacing an error for what is decorative data (GAP-FRONTEND-245).
 * - Allow up to 2 retries for transient network errors (no HTTP response —
 *   offline blip, CORS preflight, blocker, etc.). These are the dominant
 *   cause of the funding-page Sentry noise (DEV-236) and usually succeed
 *   on retry.
 * - Allow one retry for everything else
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isAxiosAbortError(error)) {
    return false;
  }

  const status = (error as any)?.response?.status ?? (error as any)?.status ?? undefined;
  if (status === 401) {
    return false;
  }

  if (status === 429) {
    return failureCount < RATE_LIMIT_MAX_RETRIES;
  }

  if (isTransientNetworkError(error)) {
    return failureCount < 2;
  }

  return failureCount < 1;
}

/**
 * Backoff schedule. Honors a server-provided `Retry-After` hint
 * (`error.retryAfterMs`, set by `FetchDataError`) when present, otherwise
 * exponential backoff capped at 30s with jitter. The jitter de-syncs the many
 * parallel requests a fan-out page fires so their retries don't all land in the
 * same second and re-trip the rate limit (thundering herd).
 */
function retryDelay(attemptIndex: number, error: unknown): number {
  const retryAfterMs = (error as { retryAfterMs?: unknown })?.retryAfterMs;
  const base =
    typeof retryAfterMs === "number" && retryAfterMs > 0
      ? Math.min(retryAfterMs, RATE_LIMIT_BACKOFF_CAP_MS)
      : Math.min(2000 * 2 ** attemptIndex, RATE_LIMIT_BACKOFF_CAP_MS);
  const jitter = Math.random() * 250;
  return Math.min(base + jitter, RATE_LIMIT_BACKOFF_CAP_MS);
}

export const defaultQueryOptions = {
  staleTime: 1000 * 60 * 1, // 1 minute
  gcTime: 1000 * 60 * 1, // 1 minute
  refetchOnWindowFocus: false,
  refetchOnMount: true,
  refetchOnReconnect: false,
  retry: shouldRetry,
  retryDelay,
};
