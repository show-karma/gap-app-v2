import { isApiError } from "./errors";

/**
 * Await `promise`; if it rejects with an "expected" ApiError (network blip,
 * 429, timeout, aborted), resolve to `fallback` instead of propagating.
 * Anything else (contract violations, unexpected 5xx, non-ApiError) rethrows.
 *
 * @public
 */
export async function orElse<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    if (isApiError(e) && e.expected) {
      return fallback;
    }
    throw e;
  }
}
