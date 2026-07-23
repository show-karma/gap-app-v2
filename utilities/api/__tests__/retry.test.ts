import { executeWithRetry, type RetryPolicy } from "@/utilities/api/retry";

describe("executeWithRetry", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("succeeds on the first try without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const policy: RetryPolicy = {
      attempts: 3,
      shouldRetry: () => true,
      delayMs: () => 0,
    };

    const result = await executeWithRetry(fn, policy);

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries until success within the attempt budget", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail-1"))
      .mockRejectedValueOnce(new Error("fail-2"))
      .mockResolvedValueOnce("ok");
    const policy: RetryPolicy = {
      attempts: 3,
      shouldRetry: () => true,
      delayMs: () => 0,
    };

    const result = await executeWithRetry(fn, policy);

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("stops at `attempts` and throws the last error", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail-1"))
      .mockRejectedValueOnce(new Error("fail-2"))
      .mockRejectedValueOnce(new Error("fail-3"));
    const policy: RetryPolicy = {
      attempts: 3,
      shouldRetry: () => true,
      delayMs: () => 0,
    };

    await expect(executeWithRetry(fn, policy)).rejects.toThrow("fail-3");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry when shouldRetry returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("nope"));
    const policy: RetryPolicy = {
      attempts: 5,
      shouldRetry: () => false,
      delayMs: () => 0,
    };

    await expect(executeWithRetry(fn, policy)).rejects.toThrow("nope");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("rejects promptly when the signal aborts DURING the backoff delay, without a further attempt", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fn = vi.fn().mockRejectedValue(new Error("retryable-fail"));
    const policy: RetryPolicy = {
      attempts: 3,
      shouldRetry: () => true,
      delayMs: () => 60_000,
      signal: controller.signal,
    };

    const promise = executeWithRetry(fn, policy).catch((e) => e);

    // Let the first attempt fail and enter the 60s backoff delay before
    // aborting — this exercises the onAbort/clearTimeout reject path inside
    // delay(), not the "already aborted" early-return.
    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);

    controller.abort(new Error("cancelled"));
    const error = await promise;

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("cancelled");
    // No 2nd attempt was made — the abort rejected mid-wait instead of
    // waiting out the full backoff.
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("passes the failed error and 0-based attempt index into delayMs before each retry", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail-1"))
      .mockRejectedValueOnce(new Error("fail-2"))
      .mockResolvedValueOnce("ok");
    const delayMs = vi.fn().mockReturnValue(0);
    const policy: RetryPolicy = {
      attempts: 3,
      shouldRetry: () => true,
      delayMs,
    };

    await executeWithRetry(fn, policy);

    expect(delayMs).toHaveBeenNthCalledWith(1, 0, expect.objectContaining({ message: "fail-1" }));
    expect(delayMs).toHaveBeenNthCalledWith(2, 1, expect.objectContaining({ message: "fail-2" }));
  });
});
