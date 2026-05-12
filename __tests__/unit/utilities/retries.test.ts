import { RetryAbortedError, retryUntilConditionMet } from "@/utilities/retries";

describe("retryUntilConditionMet — AbortSignal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should_reject_with_AbortError_when_signal_already_aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const condition = vi.fn().mockResolvedValue(false);

    await expect(
      retryUntilConditionMet(condition, undefined, 5, 100, controller.signal)
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(condition).not.toHaveBeenCalled();
  });

  it("should_stop_iterating_after_abort_fires_mid_loop", async () => {
    const controller = new AbortController();
    const condition = vi.fn().mockResolvedValue(false);

    const promise = retryUntilConditionMet(condition, undefined, 10, 100, controller.signal);

    // Allow the first condition check to run.
    await vi.advanceTimersByTimeAsync(0);
    expect(condition).toHaveBeenCalledTimes(1);

    // Trigger abort while the loop is sleeping between iterations.
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });

    // No further condition checks fire after abort.
    expect(condition).toHaveBeenCalledTimes(1);
  });

  it("should_resolve_normally_when_condition_met_before_abort", async () => {
    const controller = new AbortController();
    const callback = vi.fn();
    const condition = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const promise = retryUntilConditionMet(condition, callback, 10, 100, controller.signal);

    await vi.advanceTimersByTimeAsync(150);
    await promise;

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should_resolve_normally_when_no_signal_provided_backward_compat", async () => {
    const condition = vi.fn().mockResolvedValue(true);

    await retryUntilConditionMet(condition, undefined, 5, 100);

    expect(condition).toHaveBeenCalledTimes(1);
  });
});

describe("RetryAbortedError", () => {
  it("should_carry_AbortError_name_so_callers_can_distinguish_cancellation", () => {
    const err = new RetryAbortedError();
    expect(err.name).toBe("AbortError");
    expect(err).toBeInstanceOf(Error);
  });

  it("should_accept_custom_message", () => {
    const err = new RetryAbortedError("custom reason");
    expect(err.message).toBe("custom reason");
  });
});
