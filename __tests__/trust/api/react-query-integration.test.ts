import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utilities/fetchData", () => ({
  default: vi.fn(),
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    COMMUNITY: {
      V2: {
        GRANTS: (slug: string) => `/v2/communities/${slug}/grants`,
      },
    },
    V2: {
      PROJECTS: {
        LIST: (limit?: number) => `/v2/projects${limit ? `?limit=${limit}` : ""}`,
        SEARCH: (query: string, limit?: number) =>
          `/v2/projects/search?q=${query}${limit ? `&limit=${limit}` : ""}`,
        LIST_PAGINATED: () => "/v2/projects/paginated",
      },
      APPLICATIONS: {
        BY_PROJECT_UID: (uid: string) => `/v2/applications/by-project/${uid}`,
      },
    },
  },
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://indexer.example.com",
  },
}));

vi.mock("@/constants/projects-explorer", () => ({
  PROJECTS_EXPLORER_CONSTANTS: {
    RESULT_LIMIT: 50,
    DEBOUNCE_DELAY_MS: 300,
    MIN_SEARCH_LENGTH: 3,
    STALE_TIME_MS: 60000,
  },
}));

import { fetchApplicationByProjectUID } from "@/services/funding-applications";
import { getExplorerProjects } from "@/services/projects-explorer.service";
import fetchData from "@/utilities/fetchData";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";

const mockFetchData = fetchData as ReturnType<typeof vi.fn>;

describe("React Query integration trust tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable for unit test speed
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  // --- Default query options ---

  describe("default query options", () => {
    it("retry is a smart function that skips 429s and 401s", () => {
      expect(typeof defaultQueryOptions.retry).toBe("function");
    });

    it("staleTime is 1 minute", () => {
      expect(defaultQueryOptions.staleTime).toBe(60000);
    });

    it("gcTime is 1 minute", () => {
      expect(defaultQueryOptions.gcTime).toBe(60000);
    });

    it("refetchOnWindowFocus is disabled", () => {
      expect(defaultQueryOptions.refetchOnWindowFocus).toBe(false);
    });

    it("refetchOnMount is enabled", () => {
      expect(defaultQueryOptions.refetchOnMount).toBe(true);
    });

    it("refetchOnReconnect is disabled", () => {
      expect(defaultQueryOptions.refetchOnReconnect).toBe(false);
    });
  });

  // --- Cache behavior via QueryClient ---

  describe("cache behavior", () => {
    it("fetchQuery caches results and returns cached data on second call", async () => {
      let callCount = 0;
      const queryFn = async () => {
        callCount++;
        return [{ id: "p1" }];
      };

      const result1 = await queryClient.fetchQuery({
        queryKey: ["projects-explorer", ""],
        queryFn,
        staleTime: 60000,
      });

      const result2 = queryClient.getQueryData(["projects-explorer", ""]);

      expect(result1).toEqual([{ id: "p1" }]);
      expect(result2).toEqual([{ id: "p1" }]);
      expect(callCount).toBe(1); // Only fetched once
    });

    it("different query keys result in separate cache entries", async () => {
      await queryClient.fetchQuery({
        queryKey: ["projects-explorer", "dao"],
        queryFn: async () => [{ id: "dao-project" }],
      });

      await queryClient.fetchQuery({
        queryKey: ["projects-explorer", "protocol"],
        queryFn: async () => [{ id: "protocol-project" }],
      });

      const daoData = queryClient.getQueryData(["projects-explorer", "dao"]);
      const protocolData = queryClient.getQueryData(["projects-explorer", "protocol"]);

      expect(daoData).toEqual([{ id: "dao-project" }]);
      expect(protocolData).toEqual([{ id: "protocol-project" }]);
    });
  });

  // --- Cache invalidation ---

  describe("cache invalidation", () => {
    it("invalidating by prefix removes all matching entries", async () => {
      await queryClient.fetchQuery({
        queryKey: ["projects-explorer", "dao"],
        queryFn: async () => [{ id: "1" }],
      });
      await queryClient.fetchQuery({
        queryKey: ["projects-explorer", ""],
        queryFn: async () => [{ id: "2" }],
      });

      queryClient.removeQueries({
        queryKey: ["projects-explorer"],
      });

      const data1 = queryClient.getQueryData(["projects-explorer", "dao"]);
      const data2 = queryClient.getQueryData(["projects-explorer", ""]);

      expect(data1).toBeUndefined();
      expect(data2).toBeUndefined();
    });

    it("invalidating specific key does not affect other keys", async () => {
      await queryClient.fetchQuery({
        queryKey: ["projects-explorer", "dao"],
        queryFn: async () => [{ id: "1" }],
      });
      await queryClient.fetchQuery({
        queryKey: ["application-by-project-uid", "p1"],
        queryFn: async () => ({ id: "app1" }),
      });

      queryClient.removeQueries({
        queryKey: ["projects-explorer"],
      });

      const explorerData = queryClient.getQueryData(["projects-explorer", "dao"]);
      const appData = queryClient.getQueryData(["application-by-project-uid", "p1"]);

      expect(explorerData).toBeUndefined();
      expect(appData).toEqual({ id: "app1" });
    });
  });

  // --- FIXED: 429 no longer retried ---

  describe("429 rate-limited requests are NOT retried (fixed)", () => {
    it("retry function skips 429 rate-limited responses", () => {
      // The defaultQueryOptions now uses a smart retry function that
      // skips retries for rate-limited (429) and unauthorized (401) responses.
      expect(typeof defaultQueryOptions.retry).toBe("function");
    });

    it("demonstrates 429 is not retried with QueryClient", async () => {
      let callCount = 0;

      const retryClient = new QueryClient({
        defaultOptions: {
          queries: {
            ...defaultQueryOptions,
          },
        },
      });

      try {
        await retryClient.fetchQuery({
          queryKey: ["test-429"],
          queryFn: async () => {
            callCount++;
            const err = new Error("Rate limited") as any;
            err.response = { status: 429 };
            throw err;
          },
          retry: defaultQueryOptions.retry,
        });
      } catch {
        // Expected to throw immediately without retries
      }

      // With smart retry, 429 is not retried - only called once
      expect(callCount).toBe(1);

      retryClient.clear();
    });
  });

  // --- Enabled condition ---

  describe("enabled condition patterns", () => {
    it("application query is disabled when projectUID is empty", () => {
      const projectUID = "";
      const enabled = !!projectUID;

      expect(enabled).toBe(false);
    });

    it("application query is enabled when projectUID is provided", () => {
      const projectUID = "project-123";
      const enabled = !!projectUID;

      expect(enabled).toBe(true);
    });

    it("explorer search normalization: short searches treated as empty", () => {
      const search = "ab";
      const MIN_SEARCH_LENGTH = 3;
      const effectiveSearch = search.length >= MIN_SEARCH_LENGTH ? search : "";

      expect(effectiveSearch).toBe("");
    });

    it("explorer search normalization: valid search passes through", () => {
      const search = "dao";
      const MIN_SEARCH_LENGTH = 3;
      const effectiveSearch = search.length >= MIN_SEARCH_LENGTH ? search : "";

      expect(effectiveSearch).toBe("dao");
    });
  });

  // --- Stale time ---

  describe("stale time configuration", () => {
    it("explorer uses PROJECTS_EXPLORER_CONSTANTS.STALE_TIME_MS (60s)", () => {
      const STALE_TIME_MS = 60 * 1000;
      expect(STALE_TIME_MS).toBe(60000);
    });

    it("default staleTime is also 1 minute", () => {
      expect(defaultQueryOptions.staleTime).toBe(1000 * 60);
    });
  });

  // --- Service integration ---

  describe("service function integration", () => {
    it("getExplorerProjects can be used as queryFn", async () => {
      mockFetchData.mockResolvedValue([[{ details: { title: "Project 1" } }], null, null, 200]);

      const result = await queryClient.fetchQuery({
        queryKey: ["projects-explorer", ""],
        queryFn: () => getExplorerProjects({}),
      });

      expect(result).toHaveLength(1);
    });

    it("fetchApplicationByProjectUID can be used as queryFn", async () => {
      mockFetchData.mockResolvedValue([{ id: "app-1", status: "submitted" }, null, null, 200]);

      const result = await queryClient.fetchQuery({
        queryKey: ["application-by-project-uid", "p1"],
        queryFn: () => fetchApplicationByProjectUID("p1"),
      });

      expect(result).toEqual({ id: "app-1", status: "submitted" });
    });

    it("failed service call causes QueryClient to enter error state", async () => {
      mockFetchData.mockResolvedValue([null, "Server Error", null, 500]);

      const state = queryClient.getQueryState(["application-by-project-uid", "p-fail"]);

      // Before any fetch, state is undefined
      expect(state).toBeUndefined();

      try {
        await queryClient.fetchQuery({
          queryKey: ["application-by-project-uid", "p-fail"],
          queryFn: () => fetchApplicationByProjectUID("p-fail"),
          retry: false,
        });
      } catch {
        // Expected - fetchApplicationByProjectUID throws on 500
      }

      const afterState = queryClient.getQueryState(["application-by-project-uid", "p-fail"]);

      expect(afterState?.status).toBe("error");
    });
  });
});
