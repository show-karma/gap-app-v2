/**
 * Generic retry utility with exponential backoff
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration
 * @returns The result of the function if successful
 * @throws The last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 15,
    initialDelayMs = 1000,
    maxDelayMs = 3000,
    backoffMultiplier = 0.3,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      if (attempt < maxRetries - 1) {
        // Calculate progressive delay with exponential backoff
        const currentDelay = Math.min(
          initialDelayMs * (1 + attempt * backoffMultiplier),
          maxDelayMs
        );
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
      }
    }
  }

  throw lastError;
}

/**
 * Retry a condition check until it returns true or max retries is reached
 *
 * @param condition - The condition function that returns a boolean or Promise<boolean>
 * @param options - Retry configuration
 * @returns true if condition was met, false if retries exhausted
 */
export async function retryUntilCondition(
  condition: () => boolean | Promise<boolean>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    onRetry?: (attempt: number) => void;
  } = {}
): Promise<boolean> {
  const {
    maxRetries = 60,
    delayMs = 500,
    onRetry,
  } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await condition();

    if (result) {
      return true;
    }

    if (onRetry) {
      onRetry(attempt + 1);
    }

    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
}
