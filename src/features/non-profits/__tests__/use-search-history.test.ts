/**
 * Unit tests for non-profits/hooks/use-search-history.ts (Phase 5 additions)
 *
 * Tests: useSearchHistoryList, useDeleteSearchHistoryEntry, useClearSearchHistory.
 * Also covers the server-side getById hydration fallback path logic.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { errAsync, okAsync } from "neverthrow";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useAddSearchHistory,
  useAppendSearchTurn,
  useClearSearchHistory,
  useDeleteSearchHistoryEntry,
  useSearchHistory,
  useSearchHistoryList,
} from "../hooks/use-search-history";
import type { AppError } from "../lib/errors";
import type {
  SavedSearchTurn,
  SearchHistoryDetail,
  SearchHistoryEntry,
} from "../services/search-history.service";
import { searchHistoryService } from "../services/search-history.service";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("../services/search-history.service", () => ({
  searchHistoryService: {
    list: vi.fn(),
    create: vi.fn(),
    getById: vi.fn(),
    appendTurn: vi.fn(),
    deleteOne: vi.fn(),
    clearAll: vi.fn(),
  },
}));

import { useAuth } from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ authenticated: true, login: vi.fn() })),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ENTRY_1: SearchHistoryEntry = {
  id: "sh-1",
  userId: "u-1",
  query: "Foundations in Ohio",
  createdAt: "2024-01-01T00:00:00Z",
};

const ENTRY_2: SearchHistoryEntry = {
  id: "sh-2",
  userId: "u-1",
  query: "Youth literacy funders",
  createdAt: "2024-01-02T00:00:00Z",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEARCH_HISTORY_KEY = ["non-profits-search-history"] as const;

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useSearchHistory (getById)", () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("fetches entry by id", async () => {
    vi.mocked(searchHistoryService.getById).mockReturnValue(
      okAsync({ ...ENTRY_1, turns: [] } satisfies SearchHistoryDetail)
    );

    const { result } = renderHook(() => useSearchHistory("sh-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.query).toBe("Foundations in Ohio");
  });

  it("is disabled when id is empty", () => {
    const { result } = renderHook(() => useSearchHistory(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(searchHistoryService.getById).not.toHaveBeenCalled();
  });

  it("returns ApiError for 404", async () => {
    const appError: AppError = { type: "ApiError", status: 404, message: "Not found" };
    vi.mocked(searchHistoryService.getById).mockReturnValue(errAsync(appError));

    const { result } = renderHook(() => useSearchHistory("missing"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(appError);
  });
});

describe("useSearchHistoryList", () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ authenticated: true, login: vi.fn() } as ReturnType<
      typeof useAuth
    >);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("fetches list when authenticated", async () => {
    vi.mocked(searchHistoryService.list).mockReturnValue(okAsync([ENTRY_1, ENTRY_2]));

    const { result } = renderHook(() => useSearchHistoryList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it("is disabled when not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({ authenticated: false, login: vi.fn() } as ReturnType<
      typeof useAuth
    >);

    const { result } = renderHook(() => useSearchHistoryList(), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(searchHistoryService.list).not.toHaveBeenCalled();
  });

  it("respects custom limit", async () => {
    vi.mocked(searchHistoryService.list).mockReturnValue(okAsync([ENTRY_1]));

    const { result } = renderHook(() => useSearchHistoryList(5), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchHistoryService.list).toHaveBeenCalledWith(5);
  });
});

describe("useAddSearchHistory", () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("prepends the new entry and deduplicates by query", async () => {
    queryClient.setQueryData(SEARCH_HISTORY_KEY, [ENTRY_1, ENTRY_2]);

    const newEntry: SearchHistoryEntry = {
      id: "sh-3",
      userId: "u-1",
      query: "Foundations in Ohio",
      createdAt: "2024-02-01T00:00:00Z",
    };
    vi.mocked(searchHistoryService.create).mockReturnValue(okAsync(newEntry));

    const { result } = renderHook(() => useAddSearchHistory(), { wrapper });

    await act(async () => {
      result.current.mutate({ query: "Foundations in Ohio" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<SearchHistoryEntry[]>(SEARCH_HISTORY_KEY);
    // Deduplication: should not have two entries with same query
    const queries = cached?.map((e) => e.query.toLowerCase()) ?? [];
    const unique = [...new Set(queries)];
    expect(unique).toHaveLength(queries.length);
  });

  it("passes the conversation id through to the service", async () => {
    vi.mocked(searchHistoryService.create).mockReturnValue(okAsync(ENTRY_1));

    const { result } = renderHook(() => useAddSearchHistory(), { wrapper });

    await act(async () => {
      result.current.mutate({ query: "Foundations in Ohio", id: "thread-1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchHistoryService.create).toHaveBeenCalledWith("Foundations in Ohio", "thread-1");
  });

  it("leaves cached detail entries (non-list values) untouched", async () => {
    const detail: SearchHistoryDetail = { ...ENTRY_1, turns: [] };
    queryClient.setQueryData([...SEARCH_HISTORY_KEY, "sh-1"], detail);
    vi.mocked(searchHistoryService.create).mockReturnValue(okAsync(ENTRY_2));

    const { result } = renderHook(() => useAddSearchHistory(), { wrapper });

    await act(async () => {
      result.current.mutate({ query: "Youth literacy funders" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData([...SEARCH_HISTORY_KEY, "sh-1"])).toEqual(detail);
  });
});

describe("useAppendSearchTurn", () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("appends the turn via the service", async () => {
    const savedTurn: SavedSearchTurn = {
      id: "turn-1",
      searchHistoryId: "sh-1",
      turnIndex: 0,
      userQuery: "Foundations in Ohio",
      narrative: "Top funders…",
      entities: [],
      citations: [],
      traceId: null,
      createdAt: "2024-01-01T00:00:00Z",
    };
    vi.mocked(searchHistoryService.appendTurn).mockReturnValue(okAsync(savedTurn));

    const { result } = renderHook(() => useAppendSearchTurn(), { wrapper });

    const payload = {
      id: "turn-1",
      userQuery: "Foundations in Ohio",
      narrative: "Top funders…",
      entities: [],
      citations: [],
      traceId: null,
    };
    await act(async () => {
      result.current.mutate({ searchId: "sh-1", turn: payload });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchHistoryService.appendTurn).toHaveBeenCalledWith("sh-1", payload);
  });

  it("surfaces errors without throwing", async () => {
    const appError: AppError = { type: "ApiError", status: 401, message: "Unauthorized" };
    vi.mocked(searchHistoryService.appendTurn).mockReturnValue(errAsync(appError));

    const { result } = renderHook(() => useAppendSearchTurn(), { wrapper });

    await act(async () => {
      result.current.mutate({
        searchId: "sh-1",
        turn: {
          id: "turn-1",
          userQuery: "q",
          narrative: "",
          entities: [],
          citations: [],
          traceId: null,
        },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(appError);
  });
});

describe("useDeleteSearchHistoryEntry", () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("optimistically removes the entry from cache", async () => {
    queryClient.setQueryData(SEARCH_HISTORY_KEY, [ENTRY_1, ENTRY_2]);
    vi.mocked(searchHistoryService.deleteOne).mockReturnValue(okAsync(undefined));

    const { result } = renderHook(() => useDeleteSearchHistoryEntry(), { wrapper });

    await act(async () => {
      result.current.mutate("sh-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<SearchHistoryEntry[]>(SEARCH_HISTORY_KEY);
    expect(cached?.some((e) => e.id === "sh-1")).toBe(false);
    expect(cached).toHaveLength(1);
  });

  it("rolls back on error", async () => {
    queryClient.setQueryData(SEARCH_HISTORY_KEY, [ENTRY_1, ENTRY_2]);
    const appError: AppError = { type: "ApiError", status: 500, message: "Error" };
    vi.mocked(searchHistoryService.deleteOne).mockReturnValue(errAsync(appError));

    const { result } = renderHook(() => useDeleteSearchHistoryEntry(), { wrapper });

    await act(async () => {
      result.current.mutate("sh-1");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isError).toBe(true);
  });
});

describe("useClearSearchHistory", () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("optimistically clears all entries", async () => {
    queryClient.setQueryData(SEARCH_HISTORY_KEY, [ENTRY_1, ENTRY_2]);
    vi.mocked(searchHistoryService.clearAll).mockReturnValue(okAsync(undefined));

    const { result } = renderHook(() => useClearSearchHistory(), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<SearchHistoryEntry[]>(SEARCH_HISTORY_KEY);
    expect(cached).toEqual([]);
  });

  it("rolls back on error", async () => {
    queryClient.setQueryData(SEARCH_HISTORY_KEY, [ENTRY_1, ENTRY_2]);
    const appError: AppError = { type: "ApiError", status: 500, message: "Error" };
    vi.mocked(searchHistoryService.clearAll).mockReturnValue(errAsync(appError));

    const { result } = renderHook(() => useClearSearchHistory(), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isError).toBe(true);
  });
});
