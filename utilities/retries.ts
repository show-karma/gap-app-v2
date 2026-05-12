import { errorManager } from "@/components/Utilities/errorManager";

/**
 * Error thrown when an abort signal cancels a retry loop. Carries
 * `name: "AbortError"` so callers can distinguish abort from condition-
 * never-met or operation-failed cases via a single check.
 */
export class RetryAbortedError extends Error {
  readonly name = "AbortError" as const;
  constructor(message = "Retry loop aborted") {
    super(message);
  }
}

/**
 * Retries a function with exponential backoff
 * @param operation The async function to retry
 * @param maxRetries The maximum number of retries
 * @param initialDelay The initial delay in milliseconds
 * @param maxDelay The maximum delay in milliseconds
 * @returns The result of the operation, or throws an error if all retries fail
 */
export async function retry<T>(
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
 * before the sleep, and after the sleep resolves. Sleeping is itself
 * abortable via `signal.addEventListener("abort", ...)` so an in-flight
 * sleep doesn't hold the loop open for the full delay after abort.
 *
 * On abort the function rejects with `RetryAbortedError` (`name:
 * "AbortError"`) — callers should check `err.name === "AbortError"` and
 * swallow it rather than reporting as a real failure.
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
