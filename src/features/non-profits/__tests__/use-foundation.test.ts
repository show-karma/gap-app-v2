/**
 * Unit tests for non-profits/hooks/use-foundation.ts
 *
 * Tests loading, success, and error states by wrapping hooks in a
 * real QueryClientProvider (matches existing test patterns).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { errAsync, okAsync } from "neverthrow";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useFoundation,
  useFoundationGrants,
  useFoundationOfficers,
  useSortState,
} from "../hooks/use-foundation";
import type { AppError } from "../lib/errors";
import { philanthropyService } from "../services/philanthropy.service";
import type { Foundation, Grant } from "../types/philanthropy";

// ── Module mocks ──────────────────────────────────────────────────────────────

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

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FOUNDATION: Foundation = {
  id: "f-test",
  ein: "11-1111111",
  name: "Test Foundation",
  description: "A test foundation",
  totalAssets: 1_000_000,
  location: "Boston, MA",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

const GRANT: Grant = {
  id: "g-test",
  filingId: "fil-test",
  foundationId: "f-test",
  nonprofitId: "n-test",
  recipientName: "Test Nonprofit",
  amount: 50_000,
  date: "2023-11-01",
  purposeText: "Education programs",
  filingYear: 2023,
  sourceRowHash: "hash123",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useFoundation", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("loading state", () => {
    it("starts in loading state before the query resolves", () => {
      vi.mocked(philanthropyService.getFoundation).mockReturnValue(
        new Promise(() => {}) as ReturnType<typeof philanthropyService.getFoundation>
      );

      const { result } = renderHook(() => useFoundation("f-test"), { wrapper });
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("success state", () => {
    it("returns data after successful fetch", async () => {
      vi.mocked(philanthropyService.getFoundation).mockReturnValue(okAsync(FOUNDATION));

      const { result } = renderHook(() => useFoundation("f-test"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(FOUNDATION);
    });
  });

  describe("error state", () => {
    it("surfaces error when service returns an AppError", async () => {
      const appError: AppError = { type: "ApiError", status: 404, message: "Not found" };
      vi.mocked(philanthropyService.getFoundation).mockReturnValue(errAsync(appError));

      const { result } = renderHook(() => useFoundation("f-test"), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(appError);
    });
  });

  describe("disabled when id is empty", () => {
    it("does not fetch when id is empty string", () => {
      vi.mocked(philanthropyService.getFoundation).mockReturnValue(okAsync(FOUNDATION));

      const { result } = renderHook(() => useFoundation(""), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
      expect(philanthropyService.getFoundation).not.toHaveBeenCalled();
    });
  });
});

describe("useFoundationGrants", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("fetches grants for a foundation", async () => {
    vi.mocked(philanthropyService.getFoundationGrants).mockReturnValue(okAsync([GRANT]));

    const { result } = renderHook(() => useFoundationGrants("f-test"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]).toEqual(GRANT);
  });

  it("passes sort params to the service", async () => {
    vi.mocked(philanthropyService.getFoundationGrants).mockReturnValue(okAsync([GRANT]));
    const sort = { sortBy: "amount", sortOrder: "desc" as const };

    const { result } = renderHook(() => useFoundationGrants("f-test", sort), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(philanthropyService.getFoundationGrants).toHaveBeenCalledWith("f-test", sort);
  });
});

describe("useFoundationOfficers", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("returns empty array when foundation has no officers", async () => {
    vi.mocked(philanthropyService.getFoundationOfficers).mockReturnValue(okAsync([]));

    const { result } = renderHook(() => useFoundationOfficers("f-test"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe("useSortState", () => {
  it("initializes with the provided defaults", () => {
    const { result } = renderHook(() => useSortState("amount", "desc"));
    expect(result.current.sort).toEqual({ sortBy: "amount", sortOrder: "desc" });
  });

  it("toggles sort order when the same field is clicked", () => {
    const { result } = renderHook(() => useSortState("amount", "desc"));
    act(() => {
      result.current.toggle("amount");
    });
    expect(result.current.sort).toEqual({ sortBy: "amount", sortOrder: "asc" });
  });

  it("resets to desc when a different field is selected", () => {
    const { result } = renderHook(() => useSortState("amount", "asc"));
    act(() => {
      result.current.toggle("filingYear");
    });
    expect(result.current.sort).toEqual({ sortBy: "filingYear", sortOrder: "desc" });
  });
});
