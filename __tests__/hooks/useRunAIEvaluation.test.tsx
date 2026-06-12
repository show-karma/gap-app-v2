/**
 * @file Tests for useRunAIEvaluation — the first-run trigger for an
 * application's AI evaluation. Verifies it dispatches to the correct service
 * method based on `isInternal`, invalidates the funding-application and
 * applications caches before resolving the optional onSuccess callback, and
 * surfaces service rejections through `mutation.error` without invalidating.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRunAIEvaluation } from "@/hooks/useRunAIEvaluation";
import { fundingApplicationsAPI } from "@/services/fundingPlatformService";

vi.mock("@/services/fundingPlatformService", () => ({
  fundingApplicationsAPI: {
    runAIEvaluation: vi.fn(),
    runInternalAIEvaluation: vi.fn(),
  },
}));

const mockApi = fundingApplicationsAPI as unknown as {
  runAIEvaluation: ReturnType<typeof vi.fn>;
  runInternalAIEvaluation: ReturnType<typeof vi.fn>;
};

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const REFERENCE = "APP-12345-67890";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useRunAIEvaluation", () => {
  describe("dispatch", () => {
    it("calls the applicant-facing endpoint by default", async () => {
      mockApi.runAIEvaluation.mockResolvedValue({ success: true });
      const client = makeClient();

      const { result } = renderHook(() => useRunAIEvaluation(), { wrapper: wrap(client) });

      await result.current.mutateAsync(REFERENCE);

      expect(mockApi.runAIEvaluation).toHaveBeenCalledWith(REFERENCE);
      expect(mockApi.runInternalAIEvaluation).not.toHaveBeenCalled();
    });

    it("calls the internal endpoint when isInternal is true", async () => {
      mockApi.runInternalAIEvaluation.mockResolvedValue({ success: true });
      const client = makeClient();

      const { result } = renderHook(() => useRunAIEvaluation({ isInternal: true }), {
        wrapper: wrap(client),
      });

      await result.current.mutateAsync(REFERENCE);

      expect(mockApi.runInternalAIEvaluation).toHaveBeenCalledWith(REFERENCE);
      expect(mockApi.runAIEvaluation).not.toHaveBeenCalled();
    });
  });

  describe("success", () => {
    it("invalidates funding-application and applications before running onSuccess", async () => {
      mockApi.runAIEvaluation.mockResolvedValue({ success: true });
      const client = makeClient();
      const invalidateSpy = vi.spyOn(client, "invalidateQueries");

      // onSuccess must observe that both invalidations have already fired,
      // so the Insights/Internal tabs refetch the new verdict before any
      // imperative callback runs.
      const onSuccess = vi.fn(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["funding-application"] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      });

      const { result } = renderHook(() => useRunAIEvaluation({ onSuccess }), {
        wrapper: wrap(client),
      });

      await result.current.mutateAsync(REFERENCE);

      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["funding-application"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["applications"] });
    });

    it("succeeds without an onSuccess callback", async () => {
      mockApi.runAIEvaluation.mockResolvedValue({ success: true });
      const client = makeClient();

      const { result } = renderHook(() => useRunAIEvaluation(), { wrapper: wrap(client) });

      await result.current.mutateAsync(REFERENCE);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("error", () => {
    it("surfaces the rejection on mutation.error and does not invalidate", async () => {
      const failure = new Error("evaluation failed");
      mockApi.runAIEvaluation.mockRejectedValue(failure);
      const client = makeClient();
      const invalidateSpy = vi.spyOn(client, "invalidateQueries");
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useRunAIEvaluation({ onSuccess }), {
        wrapper: wrap(client),
      });

      await expect(result.current.mutateAsync(REFERENCE)).rejects.toThrow("evaluation failed");

      await waitFor(() => expect(result.current.error).toBe(failure));
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
