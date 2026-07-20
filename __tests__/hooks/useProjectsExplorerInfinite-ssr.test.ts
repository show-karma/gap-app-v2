import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockProject } from "@/__tests__/factories/project.factory";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";
import type { ExplorerSortByOptions, ExplorerSortOrder } from "@/types/explorer";
import type { PaginatedProjectsResponse } from "@/types/v2/project";

/**
 * SSR seeding for useProjectsExplorerInfinite (ADR 0001). Pins the optional
 * initialData/initialPage contract now supported by the hook: a seed becomes the
 * query's initialData (InfiniteData), initialPageParam and the query key adopt
 * the start page, refetchOnMount is disabled so the SSR page is not re-fetched on
 * mount, and the flattened projects/totalCount come from the seed. Without a seed
 * the hook keeps its baseline behavior (page 1, no initialData, refetchOnMount
 * always) but still keys on the start page so page-1 and page-3 stay distinct.
 *
 * useInfiniteQuery is mocked to capture the exact config without a network or a
 * QueryClient; the hook is invoked directly through a typed compatibility cast.
 */

const { useInfiniteQueryMock, getExplorerProjectsPaginatedMock } = vi.hoisted(() => ({
  useInfiniteQueryMock: vi.fn(),
  getExplorerProjectsPaginatedMock: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useInfiniteQuery: useInfiniteQueryMock };
});

vi.mock("@/services/projects-explorer.service", () => ({
  getExplorerProjectsPaginated: getExplorerProjectsPaginatedMock,
}));

import { useProjectsExplorerInfinite } from "@/hooks/useProjectsExplorerInfinite";

interface ExtendedOptions {
  search?: string;
  sortBy?: ExplorerSortByOptions;
  sortOrder?: ExplorerSortOrder;
  limit?: number;
  enabled?: boolean;
  hasPayoutAddress?: boolean;
  initialData?: unknown;
  initialPage?: number;
}

interface HookResult {
  projects: unknown[];
  totalCount: number;
}

// The production hook does not yet accept initialData/initialPage — bridge to the
// intended signature this slice pins.
const callHook = useProjectsExplorerInfinite as unknown as (options: ExtendedOptions) => HookResult;

const ACTIVE_FILTERS = {
  search: "dao",
  sortBy: "title" as ExplorerSortByOptions,
  sortOrder: "asc" as ExplorerSortOrder,
  hasPayoutAddress: true,
};

function buildResponse(): PaginatedProjectsResponse {
  return {
    payload: [
      createMockProject({ details: { title: "DAO Tooling", slug: "dao-tooling" } }),
      createMockProject({ details: { title: "DAO Ops", slug: "dao-ops" } }),
    ],
    pagination: {
      totalCount: 137,
      page: 3,
      limit: PROJECTS_EXPLORER_CONSTANTS.RESULT_LIMIT,
      totalPages: 3,
      nextPage: null,
      prevPage: 2,
      hasNextPage: false,
      hasPrevPage: true,
    },
  };
}

function captureConfig(options: ExtendedOptions): {
  result: HookResult;
  config: Record<string, unknown>;
} {
  const result = callHook(options);
  const config = useInfiniteQueryMock.mock.calls.at(-1)?.[0] as Record<string, unknown>;
  return { result, config };
}

beforeEach(() => {
  vi.clearAllMocks();
  // useInfiniteQuery echoes the config's initialData back as the query data, so
  // the hook's flattening reflects whatever seed the config carries.
  useInfiniteQueryMock.mockImplementation((config: { initialData?: unknown }) => ({
    data: config.initialData,
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    isError: false,
    error: null,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  }));
});

describe("useProjectsExplorerInfinite SSR seeding", () => {
  describe("with a page-3 seed", () => {
    it("adopts the seed as InfiniteData, keys/starts on page 3, and disables refetchOnMount", () => {
      const response = buildResponse();
      const { result, config } = captureConfig({
        ...ACTIVE_FILTERS,
        initialData: { pages: [response], pageParams: [3] },
        initialPage: 3,
      });

      expect(config.initialData).toEqual({ pages: [response], pageParams: [3] });
      expect(config.initialPageParam).toBe(3);
      expect(config.refetchOnMount).toBe(false);
      expect(config.queryKey).toContain(3);

      // Flattened output comes from the seed.
      expect(result.projects).toEqual(response.payload);
      expect(result.totalCount).toBe(137);
    });

    it("still fetches later pages with the active filters through the captured queryFn", async () => {
      const response = buildResponse();
      getExplorerProjectsPaginatedMock.mockResolvedValue(response);

      const { config } = captureConfig({
        ...ACTIVE_FILTERS,
        initialData: { pages: [response], pageParams: [3] },
        initialPage: 3,
      });

      const queryFn = config.queryFn as (ctx: { pageParam: number }) => Promise<unknown>;
      await queryFn({ pageParam: 4 });

      expect(getExplorerProjectsPaginatedMock).toHaveBeenCalledTimes(1);
      expect(getExplorerProjectsPaginatedMock).toHaveBeenCalledWith({
        search: "dao",
        page: 4,
        limit: PROJECTS_EXPLORER_CONSTANTS.RESULT_LIMIT,
        sortBy: "title",
        sortOrder: "asc",
        includeStats: true,
        hasPayoutAddress: true,
      });
    });
  });

  describe("without a seed", () => {
    it("starts at page 1, carries no initialData, and keeps refetchOnMount always", () => {
      const { config } = captureConfig({ ...ACTIVE_FILTERS });

      expect(config.initialPageParam).toBe(1);
      expect(config.initialData).toBeUndefined();
      expect(config.refetchOnMount).toBe("always");
      expect(config.queryKey).toContain(1);
    });
  });

  it("keys page 1 and page 3 distinctly for the same filters", () => {
    const response = buildResponse();

    const page3 = captureConfig({
      ...ACTIVE_FILTERS,
      initialData: { pages: [response], pageParams: [3] },
      initialPage: 3,
    }).config.queryKey;

    const page1 = captureConfig({ ...ACTIVE_FILTERS }).config.queryKey;

    expect(page3).not.toEqual(page1);
    expect(page3).toContain(3);
    expect(page1).toContain(1);
  });
});
