/**
 * Unit tests for non-profits/hooks/use-nonprofit.ts
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { errAsync, okAsync } from "neverthrow";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNonprofit, useNonprofitGrants } from "../hooks/use-nonprofit";
import type { AppError } from "../lib/errors";
import { philanthropyService } from "../services/philanthropy.service";
import type { Grant, Nonprofit } from "../types/philanthropy";

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

const NONPROFIT: Nonprofit = {
  id: "n-1",
  ein: "55-5555555",
  name: "Youth Forward",
  description: "Serving youth",
  location: "Atlanta, GA",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

const GRANT: Grant = {
  id: "g-1",
  filingId: "fil-1",
  foundationId: "f-1",
  nonprofitId: "n-1",
  recipientName: "Youth Forward",
  amount: 25_000,
  date: "2023-07-01",
  purposeText: "After-school programs",
  filingYear: 2023,
  sourceRowHash: "xyz789",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useNonprofit", () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("returns nonprofit data on success", async () => {
    vi.mocked(philanthropyService.getNonprofit).mockReturnValue(okAsync(NONPROFIT));

    const { result } = renderHook(() => useNonprofit("n-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe("Youth Forward");
  });

  it("is disabled when id is empty", () => {
    const { result } = renderHook(() => useNonprofit(""), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(philanthropyService.getNonprofit).not.toHaveBeenCalled();
  });

  it("exposes error state on failure", async () => {
    const appError: AppError = { type: "NetworkError", message: "No connection" };
    vi.mocked(philanthropyService.getNonprofit).mockReturnValue(errAsync(appError));

    const { result } = renderHook(() => useNonprofit("n-fail"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(appError);
  });
});

describe("useNonprofitGrants", () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("returns grants for a nonprofit", async () => {
    vi.mocked(philanthropyService.getNonprofitGrants).mockReturnValue(okAsync([GRANT]));

    const { result } = renderHook(() => useNonprofitGrants("n-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].purposeText).toBe("After-school programs");
  });

  it("calls the correct service method with the nonprofit id", async () => {
    vi.mocked(philanthropyService.getNonprofitGrants).mockReturnValue(okAsync([]));

    const { result } = renderHook(() => useNonprofitGrants("n-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(philanthropyService.getNonprofitGrants).toHaveBeenCalledWith("n-1");
  });
});
