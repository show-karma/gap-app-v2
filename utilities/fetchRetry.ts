import { isRetryableIdempotentFetchError } from "@/utilities/sentry/transientErrors";

/**
 * Server-side retry policy for transient, idempotent indexer fetches.
 *
 * Context: Sentry issue GAP-FRONTEND-1Y9 (and siblings -1YD/-1YA/-1YB/-1YP,
 * ~755 events total) are transient Node/undici socket resets during SSR —
 * "Client network socket disconnected before secure TLS connection was
 * established", "socket hang up", `ECONNRESET`, etc. They crash a server
 * render with no actionable first-party frame; a single retry almost always
 * succeeds because the blip is momentary.
 *
 * This module deliberately does NOT extend `utilities/retry.ts` or
 * `utilities/retries.ts` — those have different (generic / attestation)
 * semantics. This one is narrowly scoped to the fetch layer.
 *
 * SERVER-ONLY by design: in the browser, React Query already retries
 * transient failures (see `utilities/queries/defaultOptions.ts`). Adding a
 * fetch-layer retry client-side would multiply attempts 3×3. So retries only
 * fire when `isServer` is true.
 */

export interface FetchRetryPolicy {
  /** Total attempts including the first. */
  maxAttempts: number;
  /** Base backoff delay; grows exponentially per attempt. */
  baseDelayMs: number;
  /** Upper bound for a single backoff delay. */
  maxDelayMs: number;
}

export const DEFAULT_FETCH_RETRY_POLICY = {
  maxAttempts: 3,
  baseDelayMs: 250,
  maxDelayMs: 1000,
} as const satisfies FetchRetryPolicy;

export interface ExecuteWithRetryOptions {
  /** HTTP method — only GET/HEAD are retried (idempotent). */
  method: string;
  /** Abort signal — retries stop the moment it is aborted. */
  signal?: AbortSignal;
  /** Whether we are running server-side. Defaults to `typeof window === "undefined"`. */
  isServer?: boolean;
  /** Override the retry policy. */
  policy?: FetchRetryPolicy;
  /** Invoked once when all attempts are exhausted, with the final error and attempt count. */
  onExhausted?: (error: unknown, attempts: number) => void;
}

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD"]);

function delay(ms: number): Promise<void> {
  // The loop re-checks `signal.aborted` before the next attempt, so we don't
  // need to reject this timer on abort.
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Runs `attempt()`, retrying on transient idempotent fetch failures with
 * full-jitter exponential backoff. Server-only; returns the first success or
 * throws the last error after `maxAttempts`.
 */
export async function executeWithRetry<T>(
  attempt: () => Promise<T>,
  opts: ExecuteWithRetryOptions
): Promise<T> {
  const {
    method,
    signal,
    isServer = typeof window === "undefined",
    policy = DEFAULT_FETCH_RETRY_POLICY,
    onExhausted,
  } = opts;

  const retriesEnabled = isServer && IDEMPOTENT_METHODS.has(method.toUpperCase());

  let lastError: unknown;
  for (let attemptIndex = 0; attemptIndex < policy.maxAttempts; attemptIndex += 1) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;

      const isLastAttempt = attemptIndex >= policy.maxAttempts - 1;
      const shouldRetry =
        retriesEnabled &&
        !isLastAttempt &&
        !signal?.aborted &&
        isRetryableIdempotentFetchError(error);

      if (!shouldRetry) {
        // Only report exhaustion when retries were actually in play and we
        // ran out of attempts on a retryable error — not on a non-retryable
        // failure that stops on attempt 1.
        if (
          retriesEnabled &&
          isLastAttempt &&
          !signal?.aborted &&
          isRetryableIdempotentFetchError(error)
        ) {
          onExhausted?.(error, attemptIndex + 1);
        }
        throw error;
      }

      // Full-jitter backoff: random point in [0, min(maxDelayMs, base * 2^i)].
      const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** attemptIndex);
      await delay(Math.random() * ceiling);
    }
  }

  // Unreachable in practice (the loop always returns or throws), but keeps
  // TypeScript's control-flow analysis happy.
  throw lastError;
}
