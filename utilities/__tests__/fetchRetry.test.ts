import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FETCH_RETRY_POLICY, executeWithRetry } from "../fetchRetry";

// Build an error shaped like the transient socket resets behind
// GAP-FRONTEND-1Y9 (retryable) unless overridden.
function socketError(code = "ECONNRESET") {
  return Object.assign(new Error(`read ${code}`), { code });
}

describe("executeWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Deterministic jitter so we can assert bounded delays.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns on success after 2 transient failures (3 calls, no onExhausted)", async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(socketError())
      .mockRejectedValueOnce(socketError())
      .mockResolvedValueOnce("ok");
    const onExhausted = vi.fn();

    const promise = executeWithRetry(attempt, {
      method: "GET",
      isServer: true,
      onExhausted,
    });

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("ok");
    expect(attempt).toHaveBeenCalledTimes(3);
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it("uses bounded, jittered backoff delays", async () => {
    const attempt = vi.fn().mockRejectedValueOnce(socketError()).mockResolvedValueOnce("ok");
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const promise = executeWithRetry(attempt, { method: "GET", isServer: true });
    await vi.runAllTimersAsync();
    await promise;

    // First retry ceiling = min(1000, 250 * 2^0) = 250; random 0.5 => 125ms.
    const delays = setTimeoutSpy.mock.calls.map((c) => c[1]);
    expect(delays).toContain(125);
    for (const d of delays as number[]) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(DEFAULT_FETCH_RETRY_POLICY.maxDelayMs);
    }
  });

  it("rejects after exactly maxAttempts and calls onExhausted once with (error, 3)", async () => {
    const err = socketError();
    const attempt = vi.fn().mockRejectedValue(err);
    const onExhausted = vi.fn();

    const promise = executeWithRetry(attempt, {
      method: "GET",
      isServer: true,
      onExhausted,
    });
    // Attach a rejection handler up-front so the async rejection is observed.
    const settled = promise.catch((e) => e);

    await vi.runAllTimersAsync();
    await expect(settled).resolves.toBe(err);
    expect(attempt).toHaveBeenCalledTimes(DEFAULT_FETCH_RETRY_POLICY.maxAttempts);
    expect(onExhausted).toHaveBeenCalledTimes(1);
    expect(onExhausted).toHaveBeenCalledWith(err, 3);
  });

  it("does not retry non-idempotent methods (POST → single attempt)", async () => {
    const attempt = vi.fn().mockRejectedValue(socketError());
    const onExhausted = vi.fn();

    const promise = executeWithRetry(attempt, {
      method: "POST",
      isServer: true,
      onExhausted,
    }).catch((e) => e);

    await vi.runAllTimersAsync();
    await promise;
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it("does not retry in the browser (isServer:false → single attempt)", async () => {
    const attempt = vi.fn().mockRejectedValue(socketError());
    const promise = executeWithRetry(attempt, { method: "GET", isServer: false }).catch((e) => e);

    await vi.runAllTimersAsync();
    await promise;
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("retries HEAD requests like GET (idempotent)", async () => {
    const attempt = vi.fn().mockRejectedValueOnce(socketError()).mockResolvedValueOnce("ok");

    const promise = executeWithRetry(attempt, { method: "HEAD", isServer: true });
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe("ok");
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("stops when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const attempt = vi.fn().mockRejectedValue(socketError());

    const promise = executeWithRetry(attempt, {
      method: "GET",
      isServer: true,
      signal: controller.signal,
    }).catch((e) => e);

    await vi.runAllTimersAsync();
    await promise;
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("stops when the signal aborts MID-BACKOFF (no extra attempt after the delay)", async () => {
    const controller = new AbortController();
    const err = socketError();
    const attempt = vi.fn().mockRejectedValue(err);

    const settled = executeWithRetry(attempt, {
      method: "GET",
      isServer: true,
      signal: controller.signal,
    }).catch((e) => e);

    // Let the first attempt fail and the backoff timer get scheduled
    // (ceiling 250ms * random 0.5 = 125ms), then abort partway through it.
    await vi.advanceTimersByTimeAsync(50);
    expect(attempt).toHaveBeenCalledTimes(1);
    controller.abort();

    // Run out the remaining backoff — the post-delay abort check must fire
    // instead of a second attempt.
    await vi.runAllTimersAsync();
    await expect(settled).resolves.toBe(err);
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("does not retry a non-retryable failure (400 response → single attempt)", async () => {
    const attempt = vi.fn().mockRejectedValue({ response: { status: 400 } });
    const onExhausted = vi.fn();

    const promise = executeWithRetry(attempt, {
      method: "GET",
      isServer: true,
      onExhausted,
    }).catch((e) => e);

    await vi.runAllTimersAsync();
    await promise;
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(onExhausted).not.toHaveBeenCalled();
  });
});
