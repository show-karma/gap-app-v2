import { isAxiosAbortError, isTransientNetworkError } from "@/utilities/sentry/transientErrors";

/**
 * Smart retry function:
 * - Never retry rate limits (429) or auth failures (401)
 * - Never retry user-cancelled requests (route change / abort)
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
  retry: shouldRetry,
  // Exponential backoff capped at 5s. Default is a constant 1s which
  // hammers the indexer during a transient outage and fails fast enough
  // that the user sees the error UI before the network recovers.
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
};
