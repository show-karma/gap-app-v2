import * as Sentry from "@sentry/nextjs";

/**
 * Capture an exception in Sentry with a stable `component` + `errorId` tag pair
 * so the issue stream can be filtered by feature surface and triaged quickly.
 * Use over `Sentry.captureException(error)` directly so we don't accumulate
 * untagged exceptions that are hard to bucket.
 */
export function captureWithContext(
  error: unknown,
  component: string,
  errorId: string,
  extra?: Record<string, unknown>
): void {
  Sentry.captureException(error, {
    tags: { component, errorId },
    extra,
  });
}
