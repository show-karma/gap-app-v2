/**
 * Unit tests for non-profits/hooks/use-grant.ts
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { errAsync, okAsync } from "neverthrow";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGrant } from "../hooks/use-grant";
import type { AppError } from "../lib/errors";
import { philanthropyService } from "../services/philanthropy.service";
import type { Grant } from "../types/philanthropy";

vi.mock("../services/philanthropy.service", () => ({
  philanthropyService: {
    getFoundation: vi.fn(),
    getFoundationGrants: vi.fn(),
    getFoundationOfficers: vi.fn(),
    getFoundationFinancials: vi.fn(),
    getFoundationFiling: vi.fn(),
    getNonprofit: vi.fn(),
    getNonprofitGrants: vi.fn(),
    getGrant: vi.fn(),
  },
}));

const GRANT: Grant = {
  id: "g-1",
  filingId: "fil-1",
  foundationId: "f-1",
  nonprofitId: "n-1",
  recipientName: "Hope Org",
  amount: 75_000,
  date: "2023-09-15",
  purposeText: "Community health programs",
  filingYear: 2023,
  sourceRowHash: "abc123",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useGrant", () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("success", () => {
    it("returns grant data on success", async () => {
      vi.mocked(philanthropyService.getGrant).mockReturnValue(okAsync(GRANT));

      const { result } = renderHook(() => useGrant("g-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(GRANT);
    });
  });

  describe("error", () => {
    it("exposes AppError on failure", async () => {
      const appError: AppError = { type: "ApiError", status: 404, message: "Grant not found" };
      vi.mocked(philanthropyService.getGrant).mockReturnValue(errAsync(appError));

      const { result } = renderHook(() => useGrant("g-missing"), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(appError);
    });
  });

  describe("disabled", () => {
    it("does not fire when id is empty", () => {
      const { result } = renderHook(() => useGrant(""), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
      expect(philanthropyService.getGrant).not.toHaveBeenCalled();
    });
  });
});
