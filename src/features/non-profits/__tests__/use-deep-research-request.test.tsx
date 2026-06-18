/**
 * Unit tests for non-profits/hooks/use-deep-research-request.ts
 *
 * Tests:
 * - delegates to philanthropyService.submitDeepResearchRequest
 * - resolves on success
 * - surfaces AppError on failure
 * - deepResearchErrorMessage maps 429 + falls back sensibly
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { errAsync, okAsync } from "neverthrow";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deepResearchErrorMessage,
  useDeepResearchRequest,
} from "../hooks/use-deep-research-request";
import type { AppError } from "../lib/errors";
import { philanthropyService } from "../services/philanthropy.service";

vi.mock("../services/philanthropy.service", () => ({
  philanthropyService: {
    submitDeepResearchRequest: vi.fn(),
  },
}));

const submitMock = vi.mocked(philanthropyService.submitDeepResearchRequest);

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const input = { email: "dev@example.org", query: "Funders for youth literacy in Ohio" };

describe("useDeepResearchRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delegates to the service and resolves on success", async () => {
    submitMock.mockReturnValue(okAsync({ success: true }));

    const { result } = renderHook(() => useDeepResearchRequest(), { wrapper });
    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(submitMock).toHaveBeenCalledWith(input);
  });

  it("surfaces the AppError on failure", async () => {
    const err: AppError = { type: "ApiError", status: 429, message: "Too Many Requests" };
    submitMock.mockReturnValue(errAsync(err));

    const { result } = renderHook(() => useDeepResearchRequest(), { wrapper });
    result.current.mutate(input);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(err);
  });
});

describe("deepResearchErrorMessage", () => {
  it("returns a friendly message for a 429", () => {
    const err: AppError = { type: "ApiError", status: 429, message: "Too Many Requests" };
    expect(deepResearchErrorMessage(err)).toMatch(/try again a little later/i);
  });

  it("returns the error message when present", () => {
    const err: AppError = { type: "NetworkError", message: "boom" };
    expect(deepResearchErrorMessage(err)).toBe("boom");
  });

  it("falls back to a generic message when no message exists", () => {
    const err: AppError = { type: "AbortError" };
    expect(deepResearchErrorMessage(err)).toMatch(/couldn't submit your request/i);
  });
});
