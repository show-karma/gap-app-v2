import { isRetryableChainError } from "@/utilities/isRetryableChainError";
import { wait } from "@/utilities/wait";

/**
 * Bounded retry for an attestation `eth_sendTransaction` that fails with a
 * transient wallet/bundler timeout.
 *
 * Background (GAP-FRONTEND-1Y2): project creation sends `eth_sendTransaction`
 * during `project.attest(signer)`. A momentary wallet/bundler "Wallet timeout"
 * surfaces as the ethers v6 "could not coalesce error" (code UNKNOWN_ERROR).
 * `hooks/useZeroDevSigner.ts` already retries gasless *client creation*, but the
 * SEND itself was not retried, so a single transient blip abandoned the whole
 * attestation. This helper closes that gap.
 *
 * Idempotency is the critical constraint. A GAP attestation creates a brand-new
 * on-chain UID on every send (the project's client-side UID is `nullRef` until
 * the tx mines), so a naive resend after a true timeout would DOUBLE-CREATE the
 * project. The dangerous sub-case is the one where the userOp WAS broadcast but
 * the client gave up waiting: the tx is still mining / being indexed when we
 * decide whether to resend. `hasAlreadyLanded()` reads the indexer (the slug
 * only resolves AFTER the tx mines and is ingested), which lags the chain by
 * seconds to tens of seconds. A single immediate check therefore almost always
 * returns `false` and we'd resend into a duplicate. So before resending we POLL
 * the guard on the same cadence the caller uses to wait for indexing, giving a
 * tx that actually landed a realistic chance to be observed first.
 */

// Number of attempts at the send itself (1 initial + retries).
export const ATTEST_SEND_MAX_ATTEMPTS = 3;
// Cadence/duration of the pre-resend idempotency poll. These mirror the
// indexing poll in components/Dialogs/ProjectDialog (1500ms interval), because
// the guard reads the same indexer the dialog waits on. We poll several times
// so a slow-but-successful first attempt is observed before we resend.
export const ATTEST_GUARD_POLL_INTERVAL_MS = 1500;
export const ATTEST_GUARD_POLL_ATTEMPTS = 4;

/**
 * Thrown when every send attempt timed out and the attestation never landed.
 *
 * Telemetry routing keys off the structural `isExhaustedRetry` flag (see
 * instrumentation-client.ts beforeSend), NOT the message wording: this wrapper
 * IS reported to Sentry, while the raw transient timeout is dropped. The
 * user-facing RETRYABLE_ERROR toast still fires because `isRetryableChainError`
 * matches "try again in a moment". The original error is preserved on `.cause`.
 */
export class AttestRetryExhaustedError extends Error {
  /**
   * Structural marker used by Sentry's `beforeSend` to report this (actionable)
   * exhausted-retry failure while dropping the raw transient timeout. Preferred
   * over message-substring matching, which is brittle.
   */
  readonly isExhaustedRetry = true;

  constructor(cause: unknown, attempts: number) {
    super(
      `Project attestation failed after ${attempts} attempts due to a persistent wallet/bundler timeout. Please try again in a moment.`,
      { cause }
    );
    this.name = "AttestRetryExhaustedError";
    // Preserve THIS throw site, and append the cause's stack for diagnostics
    // rather than overwriting it (which would lose where the wrapper was thrown).
    if (cause instanceof Error && cause.stack) {
      this.stack = `${this.stack ?? ""}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * True when the error is the exhausted-retry wrapper. Structural check used by
 * Sentry routing so we don't depend on the wrapper's exact wording.
 */
export function isAttestRetryExhaustedError(error: unknown): error is AttestRetryExhaustedError {
  return (
    !!error &&
    typeof error === "object" &&
    (error as { isExhaustedRetry?: unknown }).isExhaustedRetry === true
  );
}

export interface AttestWithRetryOptions<T> {
  /**
   * Performs the actual attestation send (e.g. `project.attest(signer, cb)`).
   * Called once per attempt.
   */
  send: () => Promise<T>;
  /**
   * Idempotency guard. Resolves `true` when a previous attempt already landed
   * on-chain and was indexed (so we must NOT resend). Polled before every retry
   * — never before the first attempt.
   */
  hasAlreadyLanded: () => Promise<boolean>;
  /** Optional override for the maximum number of attempts (default 3). */
  maxAttempts?: number;
  /** Optional override for the number of pre-resend guard polls (default 4). */
  guardPollAttempts?: number;
  /** Optional override for the guard poll interval in ms (default 1500). */
  guardPollIntervalMs?: number;
  /** Optional hook invoked for each retryable failure (logging/telemetry). */
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
 * Polls the idempotency guard at the indexing cadence. Resolves `true` as soon
 * as a landed attestation is observed, otherwise `false` after the bounded
 * window. This is what gives a genuinely-broadcast-but-slow first attempt a
 * chance to be seen before we risk a duplicate resend.
 */
async function waitForAlreadyLanded(
  hasAlreadyLanded: () => Promise<boolean>,
  pollAttempts: number,
  pollIntervalMs: number
): Promise<boolean> {
  for (let poll = 0; poll < pollAttempts; poll += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await hasAlreadyLanded()) {
      return true;
    }
    if (poll < pollAttempts - 1) {
      // eslint-disable-next-line no-await-in-loop
      await wait(pollIntervalMs);
    }
  }
  return false;
}

/**
 * Runs `send`, retrying on transient chain/wallet errors. Before each resend it
 * polls the idempotency guard so a slow-but-landed first attempt is not
 * duplicated. Throws the last error once attempts are exhausted (or immediately
 * for a non-retryable error), so the caller's existing catch/telemetry handles
 * the genuinely-failed case.
 */
export async function attestWithRetry<T>({
  send,
  hasAlreadyLanded,
  maxAttempts = ATTEST_SEND_MAX_ATTEMPTS,
  guardPollAttempts = ATTEST_GUARD_POLL_ATTEMPTS,
  guardPollIntervalMs = ATTEST_GUARD_POLL_INTERVAL_MS,
  onRetry,
}: AttestWithRetryOptions<T>): Promise<AttestWithRetryResult<T>> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // Idempotency guard: before any resend, give the previous (timed-out)
    // attempt a realistic window to surface as indexed. The indexer lags the
    // chain, so a single immediate check would miss a tx that actually landed
    // and we'd resend into a duplicate. Poll on the indexing cadence instead.
    if (
      attempt > 0 &&
      // eslint-disable-next-line no-await-in-loop
      (await waitForAlreadyLanded(hasAlreadyLanded, guardPollAttempts, guardPollIntervalMs))
    ) {
      return { result: null, recoveredByIdempotencyGuard: true };
    }

    try {
      // eslint-disable-next-line no-await-in-loop
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
    }
  }

  // Every attempt was a transient timeout that never recovered. Surface a
  // distinct, reportable error (the raw "could not coalesce" signature is
  // dropped by Sentry's beforeSend as transient noise — see
  // utilities/sentry/transientErrors.ts).
  throw new AttestRetryExhaustedError(lastError, maxAttempts);
}
