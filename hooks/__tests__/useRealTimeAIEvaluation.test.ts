import * as Sentry from "@sentry/nextjs";
import { act, renderHook } from "@testing-library/react";
import { TokenManager } from "@/utilities/auth/token-manager";
import {
  AI_EVALUATION_TIMEOUT_MS,
  AIEvaluationError,
  useRealTimeAIEvaluation,
} from "../useRealTimeAIEvaluation";

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

const makeFetchSuccess = (success = true) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success,
      data: mockEvaluationData,
      promptId: "prompt-123",
    }),
  });

const makeFetchError = (status = 500) =>
  vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: status === 500 ? "Internal Server Error" : "Error",
  });

const makeFetchBadJson = () =>
  vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError("Unexpected token < in JSON at position 0");
    },
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
    vi.mocked(TokenManager.getAuthHeader).mockResolvedValue({ Authorization: "Bearer test-token" });
    vi.mocked(Sentry.captureException).mockClear();
    vi.mocked(Sentry.captureMessage).mockClear();
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

    act(() => {
      result.current.triggerEvaluation({ title: "call1" });
      result.current.triggerEvaluation({ title: "call2" });
      result.current.triggerEvaluation({ title: "call3" });
    });

    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sets isLoading=true INSIDE debounce (not before)", async () => {
    global.fetch = makeFetchHanging();

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 500 })
    );

    act(() => {
      result.current.triggerEvaluation({ title: "test" });
    });

    expect(result.current.isLoading).toBe(false);

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

  it("handles non-OK API errors with applicant-friendly copy", async () => {
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

    expect(result.current.error).toBe(
      "AI feedback is unavailable right now. You can submit your application without it."
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.evaluation).toBeNull();
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("handles success:false API responses with applicant-friendly copy", async () => {
    global.fetch = makeFetchSuccess(false);

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 100 })
    );

    await act(async () => {
      result.current.triggerEvaluation({ title: "test" });
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBe(
      "AI feedback is unavailable right now. You can submit your application without it."
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.evaluation).toBeNull();
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("maps a 401 response to the reconnect-wallet message and logs an info breadcrumb", async () => {
    global.fetch = makeFetchError(401);

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 100 })
    );

    await act(async () => {
      result.current.triggerEvaluation({ title: "test" });
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBe(
      "Please reconnect your wallet to get AI feedback, or submit your application without it."
    );
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("auth rejected"),
      expect.objectContaining({
        level: "info",
        extra: expect.objectContaining({ status: 401, programId: "prog-1" }),
      })
    );
  });

  it("captures HTTP status in Sentry extras for non-OK responses", async () => {
    global.fetch = makeFetchError(503);

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 100 })
    );

    await act(async () => {
      result.current.triggerEvaluation({ title: "test" });
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const call = vi.mocked(Sentry.captureException).mock.calls[0];
    expect(call[1]?.extra).toMatchObject({ status: 503 });
    const captured = call[0] as AIEvaluationError;
    expect(captured).toBeInstanceOf(AIEvaluationError);
    expect(captured.cause).toBe("http");
    expect(captured.status).toBe(503);
  });

  it("returns the generic unavailable copy when JSON parsing fails and logs Sentry only once", async () => {
    global.fetch = makeFetchBadJson();

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 100 })
    );

    await act(async () => {
      result.current.triggerEvaluation({ title: "test" });
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBe(
      "AI feedback is unavailable right now. You can submit your application without it."
    );
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(vi.mocked(Sentry.captureException).mock.calls[0][1]?.tags).toMatchObject({
      errorId: "ai-realtime-evaluation-json-parse-failed",
    });
  });

  it("returns the friendly unavailable copy when the network throws (not the raw browser message)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 100 })
    );

    await act(async () => {
      result.current.triggerEvaluation({ title: "test" });
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBe(
      "AI feedback is unavailable right now. You can submit your application without it."
    );
    expect(result.current.error).not.toContain("Failed to fetch");
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("re-fetches after a failure when triggered with the same payload", async () => {
    const failingFetch = makeFetchError(500);
    global.fetch = failingFetch;

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 100 })
    );

    await act(async () => {
      result.current.triggerEvaluation({ title: "same" });
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(failingFetch).toHaveBeenCalledTimes(1);
    expect(result.current.error).not.toBeNull();

    await act(async () => {
      result.current.triggerEvaluation({ title: "same" });
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(failingFetch).toHaveBeenCalledTimes(2);
  });

  it("shows reconnect copy when auth headers cannot be loaded", async () => {
    global.fetch = makeFetchSuccess();
    vi.mocked(TokenManager.getAuthHeader).mockRejectedValueOnce(new Error("No token"));

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 100 })
    );

    await act(async () => {
      result.current.triggerEvaluation({ title: "test" });
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBe(
      "Please reconnect your wallet to get AI feedback, or submit your application without it."
    );
    expect(global.fetch).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it("aborts request after 30s timeout via AbortController", async () => {
    global.fetch = makeFetchHanging();

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 100 })
    );

    await act(async () => {
      result.current.triggerEvaluation({ title: "test" });
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(AI_EVALUATION_TIMEOUT_MS / 2);
      await Promise.resolve();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(AI_EVALUATION_TIMEOUT_MS / 2);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBe(
      "AI feedback is taking longer than expected. You can submit your application without it."
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("keeps loading stable when a hanging request is superseded", async () => {
    global.fetch = makeFetchHanging();

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 100 })
    );

    await act(async () => {
      result.current.triggerEvaluation({ title: "first" });
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      result.current.triggerEvaluation({ title: "second" });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not evaluate after unmounting with a pending debounce", async () => {
    const fetchMock = makeFetchSuccess();
    global.fetch = fetchMock;

    const { result, unmount } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 500 })
    );

    act(() => {
      result.current.triggerEvaluation({ title: "test" });
    });

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cancels a pending debounce when programId changes mid-debounce", async () => {
    const fetchMock = makeFetchSuccess();
    global.fetch = fetchMock;

    const { result, rerender } = renderHook(
      ({ programId }) => useRealTimeAIEvaluation({ programId, isEnabled: true, debounceMs: 500 }),
      { initialProps: { programId: "prog-1" } }
    );

    act(() => {
      result.current.triggerEvaluation({ title: "test" });
    });

    rerender({ programId: "prog-2" });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    // Pending debounce was scheduled under prog-1 but config switched to prog-2,
    // so no fetch should fire — stale work is cancelled.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not re-evaluate when called with identical data", async () => {
    const fetchMock = makeFetchSuccess();
    global.fetch = fetchMock;

    const applicationData = { title: "same data" };

    const { result } = renderHook(() =>
      useRealTimeAIEvaluation({ programId: "prog-1", isEnabled: true, debounceMs: 100 })
    );

    await act(async () => {
      result.current.triggerEvaluation(applicationData);
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.triggerEvaluation(applicationData);
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

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
