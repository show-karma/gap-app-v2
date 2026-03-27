import { act, renderHook } from "@testing-library/react";
import { useRealTimeAIEvaluation } from "../useRealTimeAIEvaluation";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getAuthHeader: vi.fn().mockResolvedValue({ Authorization: "Bearer test-token" }),
  },
}));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://api.test.com",
  },
}));

const mockEvaluationData = { score: 85, feedback: "Good application" };

const makeFetchSuccess = () =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: mockEvaluationData,
      promptId: "prompt-123",
    }),
  });

const makeFetchError = () =>
  vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
  });

const makeFetchHanging = () =>
  vi.fn().mockImplementation((_url: string, options: RequestInit) => {
    return new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  });

describe("useRealTimeAIEvaluation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns initial state (isLoading: false, evaluation: null, error: null)", () => {
    global.fetch = makeFetchSuccess();
    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.evaluation).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.evaluationResponse).toBeNull();
  });

  it("does not call fetch when isEnabled is false", async () => {
    const fetchMock = makeFetchSuccess();
    global.fetch = fetchMock;

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: false })
    );

    await act(async () => {
      result.current.triggerEvaluation({ title: "test" });
      vi.runAllTimers();
      await Promise.resolve();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("debounces multiple rapid calls — only one API call fires", async () => {
    const fetchMock = makeFetchSuccess();
    global.fetch = fetchMock;

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 500 })
    );

    // Multiple rapid calls
    act(() => {
      result.current.triggerEvaluation({ title: "call1" });
      result.current.triggerEvaluation({ title: "call2" });
      result.current.triggerEvaluation({ title: "call3" });
    });

    // Before debounce fires: no fetch yet
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Only one fetch despite three calls
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sets isLoading=true INSIDE debounce (not before)", async () => {
    // Hanging fetch so we can observe the loading state
    global.fetch = makeFetchHanging();

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 500 })
    );

    // Trigger — isLoading should still be false BEFORE debounce fires
    act(() => {
      result.current.triggerEvaluation({ title: "test" });
    });

    expect(result.current.isLoading).toBe(false);

    // Fire debounce — isLoading becomes true inside the timeout callback
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("sets evaluation data after successful response", async () => {
    global.fetch = makeFetchSuccess();

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 100 })
    );

    await act(async () => {
      result.current.triggerEvaluation({ title: "test" });
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.evaluation).toEqual(mockEvaluationData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles API errors gracefully without throwing", async () => {
    global.fetch = makeFetchError();

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 100 })
    );

    await act(async () => {
      result.current.triggerEvaluation({ title: "test" });
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.evaluation).toBeNull();
  });

  it("aborts request after 15s timeout via AbortController", async () => {
    global.fetch = makeFetchHanging();

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 100 })
    );

    // Fire debounce — starts the fetch and the 15s abort timer
    await act(async () => {
      result.current.triggerEvaluation({ title: "test" });
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    // Fire 15s abort timeout
    await act(async () => {
      vi.advanceTimersByTime(15_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBe("AI evaluation timed out. You can submit without it.");
  });

  it("cleans up debounce timeout and aborts in-flight request on unmount", () => {
    global.fetch = makeFetchHanging();
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    const { result, unmount } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 500 })
    );

    act(() => {
      result.current.triggerEvaluation({ title: "test" });
    });

    unmount();

    // clearTimeout should have been called for the pending debounce
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("does not re-evaluate when called with identical data", async () => {
    const fetchMock = makeFetchSuccess();
    global.fetch = fetchMock;

    const applicationData = { title: "same data" };

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 100 })
    );

    // First call
    await act(async () => {
      result.current.triggerEvaluation(applicationData);
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call with exact same data
    await act(async () => {
      result.current.triggerEvaluation(applicationData);
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    // No additional fetch
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clearEvaluation resets all state", async () => {
    global.fetch = makeFetchSuccess();

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 100 })
    );

    await act(async () => {
      result.current.triggerEvaluation({ title: "test" });
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.evaluation).toEqual(mockEvaluationData);

    act(() => {
      result.current.clearEvaluation();
    });

    expect(result.current.evaluation).toBeNull();
    expect(result.current.evaluationResponse).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
