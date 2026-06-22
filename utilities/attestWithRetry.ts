import { isRetryableChainError } from "@/utilities/isRetryableChainError";
import { wait } from "@/utilities/wait";

/**
 * Bounded retry + backoff for an attestation `eth_sendTransaction` that fails
 * with a transient wallet/bundler timeout.
 *
 * Background (GAP-FRONTEND-1Y2): project creation sends `eth_sendTransaction`
 * during `project.attest(signer)`. A momentary wallet/bundler "Wallet timeout"
 * surfaces as the ethers v6 "could not coalesce error" (code UNKNOWN_ERROR).
 * `hooks/useZeroDevSigner.ts` already retries gasless *client creation*, but the
 * SEND itself was not retried, so a single transient blip abandoned the whole
 * attestation. This helper closes that gap, mirroring the gasless-client retry
 * style/constants.
 *
 * Idempotency is the critical constraint. A GAP attestation creates a brand-new
 * on-chain UID on every send (the project's client-side UID is `nullRef` until
 * the tx mines), so a naive resend after a true timeout would DOUBLE-CREATE the
 * project. Before every retry we therefore call `hasAlreadyLanded()`: if the
 * previous (timed-out) attempt actually mined and got indexed, we stop and
 * surface a synthetic success instead of resending.
 */

// Mirror the gasless-client retry constants in hooks/useZeroDevSigner.ts so the
// send and the client-creation retries behave consistently.
export const ATTEST_SEND_MAX_ATTEMPTS = 3;
export const ATTEST_SEND_RETRY_BASE_DELAY_MS = 300;

/**
 * Thrown when every retry attempt timed out and the attestation never landed.
 *
 * Deliberately worded so that:
 *  - `isRetryableChainError` still matches it ("try again in a moment"), keeping
 *    the user-facing RETRYABLE_ERROR toast and form-data retention, AND
 *  - `isTransientWalletTimeoutError` does NOT match it (no "could not coalesce"
 *    / "wallet timeout" fragment), so the exhausted failure IS reported to
 *    Sentry instead of being dropped as transient noise. The original error is
 *    preserved on `.cause` for diagnostics.
 */
export class AttestRetryExhaustedError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown, attempts: number) {
    super(
      `Project attestation failed after ${attempts} attempts due to a persistent wallet/bundler timeout. Please try again in a moment.`
    );
    this.name = "AttestRetryExhaustedError";
    this.cause = cause;
    if (cause instanceof Error && cause.stack) {
      this.stack = cause.stack;
    }
  }
}

export interface AttestWithRetryOptions<T> {
  /**
   * Performs the actual attestation send (e.g. `project.attest(signer, cb)`).
   * Called once per attempt.
   */
  send: () => Promise<T>;
  /**
   * Idempotency guard. Resolves `true` when a previous attempt already landed
   * on-chain and was indexed (so we must NOT resend). Checked before every
   * retry — never before the first attempt.
   */
  hasAlreadyLanded: () => Promise<boolean>;
  /** Optional override for the maximum number of attempts (default 3). */
  maxAttempts?: number;
  /** Optional override for the base backoff in ms (default 300). */
  baseDelayMs?: number;
  /** Optional hook invoked before each backoff wait (logging/telemetry). */
  onRetry?: (attempt: number, error: unknown) => void;
}

export interface AttestWithRetryResult<T> {
  /**
   * The send result. `null` only when a retry was skipped because the
   * idempotency guard reported the attestation already landed — in that case
   * the work is done and the caller should treat it as success.
   */
  result: T | null;
  /** True when a prior timed-out attempt was detected as already landed. */
  recoveredByIdempotencyGuard: boolean;
}

/**
 * Runs `send`, retrying with backoff on transient chain/wallet errors. Throws
 * the last error once attempts are exhausted (or immediately for a
 * non-retryable error), so the caller's existing catch/telemetry handles the
 * genuinely-failed case.
 */
export async function attestWithRetry<T>({
  send,
  hasAlreadyLanded,
  maxAttempts = ATTEST_SEND_MAX_ATTEMPTS,
  baseDelayMs = ATTEST_SEND_RETRY_BASE_DELAY_MS,
  onRetry,
}: AttestWithRetryOptions<T>): Promise<AttestWithRetryResult<T>> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // Idempotency guard: before any resend, confirm the previous timed-out
    // attempt didn't actually land. If it did, stop — resending would
    // double-create the project.
    if (attempt > 0 && (await hasAlreadyLanded())) {
      return { result: null, recoveredByIdempotencyGuard: true };
    }

    try {
      const result = await send();
      return { result, recoveredByIdempotencyGuard: false };
    } catch (error) {
      lastError = error;

      // Only transient wallet/bundler timeouts are safe to retry; surface
      // anything else immediately (it won't get better by resending).
      if (!isRetryableChainError(error)) {
        throw error;
      }

      onRetry?.(attempt, error);

      if (attempt < maxAttempts - 1) {
        await wait(baseDelayMs * (attempt + 1));
      }
    }
  }

  // Every attempt was a transient timeout that never recovered. Surface a
  // distinct, reportable error (the raw "could not coalesce" signature is
  // dropped by Sentry's beforeSend as transient noise — see
  // utilities/sentry/transientErrors.ts).
  throw new AttestRetryExhaustedError(lastError, maxAttempts);
}
