import { type HttpError, isApiError } from "@/utilities/api/errors";
import { isAxiosAbortError, isTransientNetworkError } from "@/utilities/sentry/transientErrors";

/**
 * Legacy untyped retry function (pre-#1775 typed taxonomy):
 * - Never retry rate limits (429) or auth failures (401)
 * - Never retry user-cancelled requests (route change / abort)
 * - Allow up to 2 retries for transient network errors (no HTTP response —
 *   offline blip, CORS preflight, blocker, etc.). These are the dominant
 *   cause of the funding-page Sentry noise (DEV-236) and usually succeed
 *   on retry.
 * - Allow one retry for everything else
 *
 * Kept verbatim (renamed only) as the fallback for any error that hasn't
 * been normalized into the typed `ApiError` taxonomy yet.
 */
function legacyShouldRetry(failureCount: number, error: unknown): boolean {
  if (isAxiosAbortError(error)) {
    return false;
  }

  const status = (error as any)?.response?.status ?? (error as any)?.status ?? undefined;
  if (status === 429 || status === 401) {
    return false;
  }

  if (isTransientNetworkError(error)) {
    return failureCount < 2;
  }

  return failureCount < 1;
}

export const defaultQueryOptions = {
  staleTime: 1000 * 60 * 1, // 1 minute
  gcTime: 1000 * 60 * 1, // 1 minute
  refetchOnWindowFocus: false,
  refetchOnMount: true,
  refetchOnReconnect: false,
  // Typed `ApiError`s (issue #1775) carry their own `retryable` verdict from
  // the classification taxonomy. Anything not yet normalized falls back to
  // the legacy untyped heuristic.
  retry: (failureCount: number, error: unknown): boolean =>
    isApiError(error)
      ? error.retryable && failureCount < 2
      : legacyShouldRetry(failureCount, error),
  // Exponential backoff capped at 30s, with full jitter. Typed HTTP errors
  // that carry a `Retry-After` hint (e.g. 429/503) honor it instead of the
  // exponential curve. This NEW formula only applies to typed `ApiError`s
  // (issue #1775) — untyped/live-query errors fall back to the LEGACY
  // 1s-base/5s-cap delay below so current production backoff is unchanged
  // for anything not yet normalized into the typed taxonomy (dark launch).
  retryDelay: (attempt: number, error: unknown): number => {
    if (isApiError(error)) {
      const hint = error.kind === "http" ? (error as HttpError).retryAfterMs : undefined;
      return Math.min(hint ?? 2000 * 2 ** attempt, 30_000) + Math.random() * 250;
    }
    return Math.min(1000 * 2 ** attempt, 5000); // legacy untyped path — unchanged from main
  },
};
