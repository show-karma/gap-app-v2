import * as Sentry from "@sentry/nextjs";

/**
 * Reports a transient indexer fetch that failed *after all retries were
 * exhausted*. The individual transient errors are suppressed as noise (see
 * `transientErrors.ts` / GAP-FRONTEND-1Y9), but a request that keeps failing
 * across every attempt is worth a low-severity signal so we can spot a
 * sustained upstream outage.
 *
 * Emitted as a `captureMessage` at `warning` level (not `captureException`)
 * so it passes the server `beforeSend` filter — that hook only drops
 * exceptions whose `originalException` is a transient error, and a
 * `captureMessage` carries none. Fingerprinted by error code (NOT endpoint)
 * so all exhausted retries of one class collapse into a single Sentry issue;
 * the endpoint lives in `extra` for drill-down.
 */
export function reportTransientFetchFailure(params: {
  endpoint: string;
  method: string;
  attempts: number;
  error: unknown;
}): void {
  const { endpoint, method, attempts, error } = params;

  const errorCode =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : undefined;
  const code = errorCode || "unknown";

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
