import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
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
        LIST_PAGINATED: (params: Record<string, string | number | undefined>) => {
          const qs = new URLSearchParams();
          if (params.q) qs.set("q", params.q);
          if (params.page) qs.set("page", params.page.toString());
          if (params.limit) qs.set("limit", params.limit.toString());
          if (params.sortBy) qs.set("sortBy", params.sortBy);
          if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
          if (params.includeStats) qs.set("includeStats", "true");
          if (params.excludeTestProjects) qs.set("excludeTestProjects", "true");
          if (params.hasPayoutAddress) qs.set("hasPayoutAddress", "true");
          return `/v2/projects/paginated?${qs.toString()}`;
        },
      },
    },
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

import { getCommunityGrants } from "@/services/community-grants.service";
import {
  getExplorerProjects,
  getExplorerProjectsPaginated,
} from "@/services/projects-explorer.service";
import type { ExplorerSortByOptions, ExplorerSortOrder } from "@/types/explorer";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

const mockGet = api.get as ReturnType<typeof vi.fn>;

describe("community-grants service trust tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCommunityGrants", () => {
    it("returns array of grants on success", async () => {
      const grants = [
        { uid: "g1", title: "Grant 1" },
        { uid: "g2", title: "Grant 2" },
      ];
      mockGet.mockResolvedValue(grants);

      const result = await getCommunityGrants("my-community");

      expect(result).toEqual(grants);
    });

    it("calls api.get with community slug in endpoint", async () => {
      mockGet.mockResolvedValue([]);

      await getCommunityGrants("test-community");

      expect(mockGet).toHaveBeenCalledWith("/v2/communities/test-community/grants");
    });

    it("returns empty array on error (does not throw)", async () => {
      mockGet.mockRejectedValue(
        new HttpError(500, {
          endpoint: "/v2/communities/my-community/grants",
          method: "GET",
          body: { message: "Server Error" },
        })
      );

      const result = await getCommunityGrants("my-community");

      expect(result).toEqual([]);
    });

    it("returns empty array when data is null but no error", async () => {
      mockGet.mockResolvedValue(null);

      const result = await getCommunityGrants("my-community");

      expect(result).toEqual([]);
    });
  });
});

describe("projects-explorer service trust tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- getExplorerProjects ---

  describe("getExplorerProjects", () => {
    it("uses LIST endpoint when no search query", async () => {
      mockGet.mockResolvedValue([]);

      await getExplorerProjects({});

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/v2/projects"));
      expect(mockGet).toHaveBeenCalledWith(expect.not.stringContaining("search"));
    });

    it("uses SEARCH endpoint when query length >= 3", async () => {
      mockGet.mockResolvedValue([]);

      await getExplorerProjects({ search: "test" });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("search"));
    });

    it("uses LIST endpoint when query length < 3", async () => {
      mockGet.mockResolvedValue([]);

      await getExplorerProjects({ search: "ab" });

      expect(mockGet).toHaveBeenCalledWith(expect.not.stringContaining("search"));
    });

    it("filters out test projects from results", async () => {
      const projects = [
        { details: { title: "Real Project" } },
        { details: { title: "test project" } },
        { details: { title: "My Test App" } },
        { details: { title: "Production App" } },
      ];
      mockGet.mockResolvedValue(projects);

      const result = await getExplorerProjects({});

      expect(result).toHaveLength(2);
      expect(result[0].details.title).toBe("Real Project");
      expect(result[1].details.title).toBe("Production App");
    });

    it("returns empty array on error (does not throw)", async () => {
      mockGet.mockRejectedValue(
        new HttpError(500, {
          endpoint: "/v2/projects",
          method: "GET",
          body: { message: "Server Error" },
        })
      );

      const result = await getExplorerProjects({});

      expect(result).toEqual([]);
    });

    it("includes projects without titles (not filtered out)", async () => {
      const projects = [{ details: {} }, { details: { title: "Normal" } }];
      mockGet.mockResolvedValue(projects);

      const result = await getExplorerProjects({});

      expect(result).toHaveLength(2);
    });
  });

  // --- getExplorerProjectsPaginated ---

  describe("getExplorerProjectsPaginated", () => {
    it("passes pagination params to endpoint", async () => {
      const response = {
        projects: [],
        total: 0,
        page: 2,
        limit: 10,
      };
      mockGet.mockResolvedValue(response);

      await getExplorerProjectsPaginated({ page: 2, limit: 10 });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("page=2"));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("limit=10"));
    });

    it("passes sortBy and sortOrder params", async () => {
      mockGet.mockResolvedValue({ projects: [], total: 0 });

      await getExplorerProjectsPaginated({
        page: 1,
        sortBy: "updatedAt" as ExplorerSortByOptions,
        sortOrder: "desc" as ExplorerSortOrder,
      });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("sortBy=updatedAt"));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("sortOrder=desc"));
    });

    it("throws on error (unlike getExplorerProjects which returns [])", async () => {
      mockGet.mockRejectedValue(
        new HttpError(500, {
          endpoint: "/v2/projects/paginated",
          method: "GET",
          body: { message: "Server Error" },
        })
      );

      await expect(getExplorerProjectsPaginated({ page: 1 })).rejects.toThrow();
    });

    it("excludes search query when length < 3", async () => {
      mockGet.mockResolvedValue({ projects: [], total: 0 });

      await getExplorerProjectsPaginated({ page: 1, search: "ab" });

      // Should not have q param
      const callArg = mockGet.mock.calls[0][0] as string;
      expect(callArg).not.toMatch(/q=ab/);
    });

    it("always sends excludeTestProjects=true", async () => {
      mockGet.mockResolvedValue({ projects: [], total: 0 });

      await getExplorerProjectsPaginated({ page: 1 });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("excludeTestProjects=true"));
    });
  });
});
