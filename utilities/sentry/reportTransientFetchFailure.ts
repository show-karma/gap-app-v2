import * as Sentry from "@sentry/nextjs";
import { getErrorCode } from "@/utilities/sentry/transientErrors";

/**
 * Reports a transient indexer fetch that failed *after all retries were
 * exhausted*. The individual transient errors are suppressed as noise (see
 * `transientErrors.ts` / GAP-FRONTEND-1Y9), but a request that keeps failing
 * across every attempt is worth a low-severity signal so we can spot a
 * sustained upstream outage.
 *
 * Emitted as a `captureMessage` at `warning` level (not `captureException`).
 * Note the server `beforeSend` hook still runs for messages — Sentry sets
 * `hint.originalException` to the message string — so this survives the
 * transient-error filter only because the message text below matches no
 * transient fragment and no `ignoreErrors` pattern (pinned by a test that
 * runs the real `beforeSend` against this exact string). Fingerprinted by
 * error code (NOT endpoint) so all exhausted retries of one class collapse
 * into a single Sentry issue; the endpoint lives in `extra` for drill-down.
 */
export function reportTransientFetchFailure(params: {
  endpoint: string;
  method: string;
  attempts: number;
  error: unknown;
}): void {
  const { endpoint, method, attempts, error } = params;

  // Same cause-walking code extraction used for classification, so an undici
  // `TypeError: fetch failed` wrapper fingerprints by its nested socket code
  // instead of collapsing into the "unknown" bucket.
  const code = getErrorCode(error) || "unknown";

  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");

  Sentry.withScope((scope) => {
    scope.setLevel("warning");
    // Fingerprint by class (error code), not endpoint — one issue per socket
    // failure mode, endpoint captured as an extra for drill-down.
    scope.setFingerprint(["transient-fetch-retries-exhausted", code]);
    scope.setTags({
      "transient.fetch": "true",
      "error.code": code,
      "http.method": method,
    });
    scope.setExtras({ endpoint, attempts, message });
    Sentry.captureMessage(`Indexer request failed after ${attempts} attempts (${code})`);
  });
}
