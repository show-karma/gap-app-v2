import { errorManager } from "@/components/Utilities/errorManager";

/**
 * Error thrown when an abort signal cancels a retry loop. Carries
 * `name: "AbortError"` so callers can distinguish abort from condition-
 * never-met or operation-failed cases via a single check.
 *
 * **Caller contract**: when the promise rejects, check
 * `err.name === "AbortError"` (or use `isAbortError`) and treat it as
 * cancellation, not as a failure. Don't surface toasts or capture to
 * Sentry — the user navigated away.
 */
export class RetryAbortedError extends Error {
  readonly name = "AbortError";
  constructor(message = "Retry loop aborted") {
    super(message);
  }
}

/**
 * Type guard for AbortSignal-style cancellation errors. Matches both
 * `RetryAbortedError` (this module) and axios's own AbortError shape,
 * which both expose `name === "AbortError"`. Use this instead of
 * `instanceof RetryAbortedError` so callers don't have to know which
 * abort point fired.
 */
export function isAbortError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

/**
 * Retries a function with exponential backoff
 * @param operation The async function to retry
 * @param maxRetries The maximum number of retries
 * @param initialDelay The initial delay in milliseconds
 * @param maxDelay The maximum delay in milliseconds
 * @returns The result of the operation, or throws an error if all retries fail
 */
async function retry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  initialDelay: number = 1000,
  maxDelay: number = 30000,
  backoff: number = 1
): Promise<T> {
  let retries = 0;
  let delay = initialDelay;

  while (retries < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        errorManager(`Operation failed after ${maxRetries} retries`, error);
        throw error;
      }

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * backoff, maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Unexpected end of retry loop");
}

/**
 * Polls an async condition function until it returns true or maxRetries
 * is exhausted. The optional `signal` lets a React component cancel the
 * loop on unmount — without it, the promise outlives the component and
 * fires its callback / next-iteration network calls in a zombie state.
 *
 * Cancellation is checked at three points: before the condition fires,
 * after it resolves, and during the sleep (via an abortable
 * `setTimeout` wrapper). Sleeping is fully abortable so an in-flight
 * sleep doesn't hold the loop open for the full delay after abort.
 *
 * **Caller contract**: on abort this rejects with `RetryAbortedError`
 * (`name: "AbortError"`). Use the exported `isAbortError(err)` helper
 * to distinguish cancellation from real failures. Cancellation should
 * be swallowed silently (no toast, no Sentry) — the user navigated away.
 */
export const retryUntilConditionMet = async (
  conditionFn: () => Promise<boolean>,
  callbackFn?: () => void,
  maxRetries: number = 200,
  delay: number = 1500,
  signal?: AbortSignal
) => {
  if (signal?.aborted) {
    throw new RetryAbortedError();
  }

  let retries = maxRetries;
  while (retries > 0) {
    if (signal?.aborted) {
      throw new RetryAbortedError();
    }
    try {
      const conditionMet = await conditionFn().catch(() => false);
      if (signal?.aborted) {
        throw new RetryAbortedError();
      }
      if (conditionMet) {
        callbackFn?.();
        return;
      }
    } catch (error) {
      if (error instanceof RetryAbortedError) throw error;
      console.error("Error checking condition:", error);
    }
    retries -= 1;
    await abortableSleep(delay, signal);
  }
  throw new Error(
    "Condition was not met after maximum retries. The operation may not have completed successfully."
  );
};

/**
 * `setTimeout` wrapped in a promise that resolves either when the delay
 * elapses or when the signal aborts. The abort path rejects with
 * `RetryAbortedError` so the caller's `while` loop exits on the next
 * iteration's abort check.
 */
function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new RetryAbortedError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new RetryAbortedError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
