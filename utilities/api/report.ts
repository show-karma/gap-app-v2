import * as Sentry from "@sentry/nextjs";
import {
  type ApiError,
  ContractViolationError,
  HttpError,
  isApiError,
  type NetworkError,
} from "./errors";

/**
 * Centralized Sentry reporting policy for the typed API client.
 *
 * Called from the client's `onExhausted` hook once retries (if any) are
 * exhausted for a request, and later reused by `errorManager` (Phase 2).
 * This is the ONE place that decides Sentry level/fingerprint/extra for
 * API failures — do not call `Sentry.captureException`/`captureMessage`
 * for API errors anywhere else.
 *
 * Policy:
 * - `ContractViolationError` → `captureException` at "error" level,
 *   fingerprinted by endpoint (a real bug — the response no longer
 *   matches the schema for this specific endpoint).
 * - Transient failure (`error.expected` — network / 429 / timeout / abort —
 *   OR a retryable upstream `HttpError`, i.e. 502/503/504) → `captureMessage`
 *   at "warning" level, fingerprinted by kind (+ status or network error
 *   code), never by endpoint. These are the errors the client retried; being
 *   called here means retries were genuinely exhausted. Retryable 5xx are
 *   `expected === false`, so they must be caught by the `retryable` branch —
 *   capturing them as exceptions would regress the historical
 *   `isTransientHttpError` suppression.
 * - Any other `HttpError` (a non-transient, non-retryable failure, e.g. 500)
 *   → normal `captureException`.
 * - Non-`ApiError` values are ignored here; legacy paths still go
 *   through `errorManager` directly.
 */
export function reportApiFailure(error: ApiError, attempts?: number): void {
  if (!isApiError(error)) return;

  if (error instanceof ContractViolationError) {
    Sentry.captureException(error, {
      level: "error",
      fingerprint: ["api-contract-violation", error.endpoint],
      extra: { endpoint: error.endpoint, method: error.method, issues: error.issues },
    });
    return;
  }

  const isTransient = error.expected || (error instanceof HttpError && error.retryable);
  if (isTransient) {
    const kindDiscriminator =
      error instanceof HttpError
        ? String(error.status)
        : ((error as NetworkError).code ?? "unknown");

    Sentry.captureMessage(`API ${error.method} request exhausted retries (${error.kind})`, {
      level: "warning",
      fingerprint: ["api-retries-exhausted", error.kind, kindDiscriminator],
      extra: { endpoint: error.endpoint, method: error.method, attempts },
    });
    return;
  }

  if (error instanceof HttpError) {
    Sentry.captureException(error, {
      extra: { endpoint: error.endpoint, method: error.method, status: error.status, attempts },
    });
  }
}
