/**
 * Smart retry function that skips retries for rate-limited (429) and
 * unauthorized (401) responses, while allowing one retry for other failures.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  // Extract HTTP status from various error shapes
  const status = (error as any)?.response?.status ?? (error as any)?.status ?? undefined;

  // Never retry rate limits or auth failures
  if (status === 429 || status === 401) {
    return false;
  }

  // Allow one retry for all other errors
  return failureCount < 1;
}

export const defaultQueryOptions = {
  staleTime: 1000 * 60 * 1, // 1 minute
  gcTime: 1000 * 60 * 1, // 1 minute
  refetchOnWindowFocus: false,
  refetchOnMount: true,
  refetchOnReconnect: false,
  retry: shouldRetry,
};
