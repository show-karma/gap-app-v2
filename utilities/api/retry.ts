/**
 * Self-contained retry executor for the typed API client.
 *
 * Deliberately has no knowledge of HTTP, axios, or classification — it just
 * runs `fn`, and on failure decides whether to retry based on the caller's
 * `RetryPolicy`. The caller (client.ts) owns:
 *  - whether we're server-side (retries are server-only)
 *  - error classification/retryability (via toApiError().retryable)
 *  - the delay formula (retry-after vs full-jitter)
 */
export interface RetryPolicy {
  /** Total tries (1 = no retry). */
  attempts: number;
  shouldRetry: (error: unknown) => boolean;
  /** attempt is the 0-based index of the FAILED try. */
  delayMs: (attempt: number, error: unknown) => number;
  signal?: AbortSignal;
}

/**
 * Aborts immediately if `signal` is already aborted, and rejects mid-wait if
 * it aborts during the delay — so a caller cancelling a request doesn't have
 * to wait out a pending retry backoff before the cancellation takes effect.
 */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error("Aborted"));
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error("Aborted"));
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function executeWithRetry<T>(
  fn: (attempt: number) => Promise<T>,
  policy: RetryPolicy
): Promise<T> {
  const { attempts, shouldRetry, delayMs, signal } = policy;
  const totalAttempts = Math.max(1, attempts);

  // Recursion (rather than a for-loop) so the sequential `await` doesn't trip
  // the `async-await-in-loop` lint — the retries are intentionally serial.
  const runAttempt = async (n: number): Promise<T> => {
    try {
      return await fn(n);
    } catch (error) {
      const isLastAttempt = n === totalAttempts - 1;
      if (signal?.aborted || isLastAttempt || !shouldRetry(error)) {
        throw error;
      }
      await delay(delayMs(n, error), signal);
      return runAttempt(n + 1);
    }
  };

  return runAttempt(0);
}
