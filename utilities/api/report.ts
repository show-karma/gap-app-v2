import * as Sentry from "@sentry/nextjs";
import {
  type ApiError,
  ContractViolationError,
  HttpError,
  isApiError,
  isTransientApiError,
  NetworkError,
} from "./errors";

/**
 * Normalizes id-like path segments to `:id` so per-entity contract
 * violations (one project, one grant, ...) collapse into a single Sentry
 * issue for the endpoint's SHAPE instead of fragmenting per identifier.
 * Used ONLY for the fingerprint — the raw endpoint is still reported in
 * `extra` for debugging.
 */
function normalizeEndpoint(ep: string): string {
  return ep
    .replace(/0x[0-9a-fA-F]+/g, ":id") // hex/eth addresses & tx hashes
    .replace(/\b[0-9a-fA-F]{16,}\b/g, ":id") // long hex ids
    .replace(/\/\d+(?=\/|$)/g, "/:id"); // numeric path segments
}

/**
 * Centralized Sentry reporting policy for the typed API client.
 *
 * Called from the client's `onExhausted` hook once retries (if any) are
 * exhausted for a request, and reused by `errorManager` (Phase 2) for
 * genuine (non-transient) typed `ApiError`s reaching it directly. This is
 * the ONE place that decides Sentry level/fingerprint/extra for API
 * failures — do not call `Sentry.captureException`/`captureMessage` for
 * API errors anywhere else.
 *
 * `opts.attempts` is the retry-exhaustion attempt count (client path).
 * `opts.errorMessage`/`opts.extra` let callers (errorManager) merge in
 * caller-provided context without this module knowing about UI concerns.
 *
 * Policy:
 * - `ContractViolationError` → `captureException` at "error" level,
 *   fingerprinted by the NORMALIZED endpoint (a real bug — the response no
 *   longer matches the schema for this specific endpoint SHAPE).
 * - Transient failure (`isTransientApiError` — network / 429 / timeout /
 *   abort / retryable upstream 5xx) → `captureMessage` at "warning" level,
 *   fingerprinted by kind (+ status or network error code), never by
 *   endpoint. These are the errors the client retried; being called here
 *   means retries were genuinely exhausted.
 * - Any other `HttpError` (a non-transient, non-retryable failure, e.g. 500)
 *   → normal `captureException`.
 * - Non-`ApiError` values are ignored here; legacy paths still go
 *   through `errorManager` directly.
 */
export function reportApiFailure(
  error: ApiError,
  opts?: { attempts?: number; errorMessage?: string; extra?: Record<string, unknown> }
): void {
  if (!isApiError(error)) return;

  const callerExtra: Record<string, unknown> = { ...opts?.extra };
  if (opts?.errorMessage) callerExtra.errorMessage = opts.errorMessage;

  if (error instanceof ContractViolationError) {
    Sentry.captureException(error, {
      level: "error",
      fingerprint: ["api-contract-violation", normalizeEndpoint(error.endpoint)],
      extra: {
        endpoint: error.endpoint,
        method: error.method,
        issues: error.issues,
        ...callerExtra,
      },
    });
    return;
  }

  const transient: boolean = isTransientApiError(error);
  if (transient) {
    const kindDiscriminator =
      error instanceof HttpError
        ? String(error.status)
        : ((error instanceof NetworkError ? error.code : undefined) ?? "unknown");

    Sentry.captureMessage(`API ${error.method} request exhausted retries (${error.kind})`, {
      level: "warning",
      fingerprint: ["api-retries-exhausted", error.kind, kindDiscriminator],
      extra: {
        endpoint: error.endpoint,
        method: error.method,
        attempts: opts?.attempts,
        ...callerExtra,
      },
    });
    return;
  }

  if (error instanceof HttpError) {
    Sentry.captureException(error, {
      extra: {
        endpoint: error.endpoint,
        method: error.method,
        status: error.status,
        attempts: opts?.attempts,
        ...callerExtra,
      },
    });
  }
}
