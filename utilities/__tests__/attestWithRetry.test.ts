/**
 * @file Unit tests for attestWithRetry.
 *
 * Guards the bounded retry + backoff + idempotency around the project-creation
 * attestation send (GAP-FRONTEND-1Y2). A transient wallet/bundler "Wallet
 * timeout" surfaces as ethers' "could not coalesce error"; we retry the send,
 * but must never double-create on a recovered timeout.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ATTEST_SEND_MAX_ATTEMPTS,
  AttestRetryExhaustedError,
  attestWithRetry,
} from "@/utilities/attestWithRetry";
import { isRetryableChainError } from "@/utilities/isRetryableChainError";
import { isTransientWalletTimeoutError } from "@/utilities/sentry/transientErrors";

const COALESCE_TIMEOUT_MESSAGE =
  'could not coalesce error (error={ "message": "Wallet timeout" }, payload={ "method": "eth_sendTransaction" }, code=UNKNOWN_ERROR, version=6.11.0)';

function makeCoalesceError(): Error {
  return new Error(COALESCE_TIMEOUT_MESSAGE);
}

describe("attestWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Helper: drive a promise that awaits fake-timer-backed backoff to completion.
  async function runWithTimers<T>(promise: Promise<T>): Promise<T> {
    await vi.runAllTimersAsync();
    return promise;
  }

  it("returns the send result on first success without retrying", async () => {
    const send = vi.fn().mockResolvedValue({ tx: [{ hash: "0xabc" }], uids: ["0x1"] });
    const hasAlreadyLanded = vi.fn().mockResolvedValue(false);

    const { result, recoveredByIdempotencyGuard } = await attestWithRetry({
      send,
      hasAlreadyLanded,
    });

    expect(result).toEqual({ tx: [{ hash: "0xabc" }], uids: ["0x1"] });
    expect(recoveredByIdempotencyGuard).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
    // Idempotency guard is never consulted before the first attempt.
    expect(hasAlreadyLanded).not.toHaveBeenCalled();
  });

  it("retries the send after a transient wallet timeout and succeeds", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(makeCoalesceError())
      .mockResolvedValueOnce({ tx: [{ hash: "0xdef" }], uids: ["0x2"] });
    const hasAlreadyLanded = vi.fn().mockResolvedValue(false);

    const { result, recoveredByIdempotencyGuard } = await runWithTimers(
      attestWithRetry({ send, hasAlreadyLanded })
    );

    expect(result).toEqual({ tx: [{ hash: "0xdef" }], uids: ["0x2"] });
    expect(recoveredByIdempotencyGuard).toBe(false);
    expect(send).toHaveBeenCalledTimes(2);
    // Guard checked exactly once — before the second (retry) attempt.
    expect(hasAlreadyLanded).toHaveBeenCalledTimes(1);
  });

  it("does NOT resend when the idempotency guard reports the attestation already landed", async () => {
    // First attempt times out (from the user's perspective) but actually mined.
    const send = vi.fn().mockRejectedValueOnce(makeCoalesceError());
    const hasAlreadyLanded = vi.fn().mockResolvedValue(true);

    const { result, recoveredByIdempotencyGuard } = await runWithTimers(
      attestWithRetry({ send, hasAlreadyLanded })
    );

    expect(recoveredByIdempotencyGuard).toBe(true);
    expect(result).toBeNull();
    // Critically: send is called only once — no double-create.
    expect(send).toHaveBeenCalledTimes(1);
    expect(hasAlreadyLanded).toHaveBeenCalledTimes(1);
  });

  it("surfaces a non-retryable error immediately without retrying", async () => {
    const fatal = new Error("Validation failed: title is required");
    const send = vi.fn().mockRejectedValue(fatal);
    const hasAlreadyLanded = vi.fn().mockResolvedValue(false);

    await expect(attestWithRetry({ send, hasAlreadyLanded })).rejects.toThrow(fatal);
    expect(send).toHaveBeenCalledTimes(1);
    expect(hasAlreadyLanded).not.toHaveBeenCalled();
  });

  it("throws AttestRetryExhaustedError after exhausting retries on persistent timeouts", async () => {
    const send = vi.fn().mockRejectedValue(makeCoalesceError());
    const hasAlreadyLanded = vi.fn().mockResolvedValue(false);

    const promise = attestWithRetry({ send, hasAlreadyLanded });
    // Attach a catch synchronously so the rejection isn't flagged as unhandled
    // while fake timers advance the backoff waits.
    const assertion = expect(promise).rejects.toBeInstanceOf(AttestRetryExhaustedError);
    await vi.runAllTimersAsync();
    await assertion;

    expect(send).toHaveBeenCalledTimes(ATTEST_SEND_MAX_ATTEMPTS);
  });

  it("preserves the original error on the exhausted error's cause", async () => {
    const original = makeCoalesceError();
    const send = vi.fn().mockRejectedValue(original);
    const hasAlreadyLanded = vi.fn().mockResolvedValue(false);

    const promise = attestWithRetry({ send, hasAlreadyLanded }).catch((e) => e);
    await vi.runAllTimersAsync();
    const error = (await promise) as AttestRetryExhaustedError;

    expect(error).toBeInstanceOf(AttestRetryExhaustedError);
    expect(error.cause).toBe(original);
  });

  it("invokes onRetry for each retryable failure", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(makeCoalesceError())
      .mockResolvedValueOnce({ tx: [], uids: [] });
    const hasAlreadyLanded = vi.fn().mockResolvedValue(false);
    const onRetry = vi.fn();

    await runWithTimers(attestWithRetry({ send, hasAlreadyLanded, onRetry }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(0, expect.any(Error));
  });

  it("respects a custom maxAttempts", async () => {
    const send = vi.fn().mockRejectedValue(makeCoalesceError());
    const hasAlreadyLanded = vi.fn().mockResolvedValue(false);

    const promise = attestWithRetry({ send, hasAlreadyLanded, maxAttempts: 2 }).catch((e) => e);
    await vi.runAllTimersAsync();
    await promise;

    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe("AttestRetryExhaustedError telemetry routing", () => {
  it("keeps the user-facing retryable toast (matches isRetryableChainError)", () => {
    const error = new AttestRetryExhaustedError(new Error("could not coalesce error"), 3);
    expect(isRetryableChainError(error)).toBe(true);
  });

  it("is reported to Sentry — does NOT match the transient-drop signature", () => {
    // The raw cause IS transient noise...
    expect(isTransientWalletTimeoutError(new Error("could not coalesce error"))).toBe(true);
    // ...but the exhausted wrapper is actionable and must reach Sentry.
    const error = new AttestRetryExhaustedError(new Error("could not coalesce error"), 3);
    expect(isTransientWalletTimeoutError(error)).toBe(false);
  });
});
