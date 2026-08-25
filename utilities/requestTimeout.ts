/**
 * Bound a request with a timeout, preserving the caller's own abort signal.
 *
 * A hung request — connection accepted, response never sent — neither resolves
 * nor rejects. React Query has no request timeout of its own, so such a query
 * stays `fetching` forever: no data, no error, and any UI keyed on those sits
 * on a loading state indefinitely with nothing to retry. Converting the hang
 * into an ordinary abort lets the normal error path handle it.
 *
 * The returned signal aborts when EITHER the caller's signal aborts (React
 * Query cancelling on unmount or key change) or the timeout elapses.
 */
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

export function withRequestTimeout(
  signal: AbortSignal | undefined,
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!signal) return timeout;

  // AbortSignal.any is the direct expression of "either of these"; it is
  // recent enough that the manual fallback below still matters.
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([signal, timeout]);
  }

  const controller = new AbortController();
  if (signal.aborted || timeout.aborted) {
    controller.abort();
    return controller.signal;
  }
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  timeout.addEventListener("abort", abort, { once: true });
  return controller.signal;
}
