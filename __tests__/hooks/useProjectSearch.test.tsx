import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@/__tests__/utils/render";
import { useProjectSearch } from "@/hooks/useProjectSearch";
import type { SearchProjectResult } from "@/services/unified-search.service";

const mockUnifiedSearch = vi.fn();
vi.mock("@/services/unified-search.service", () => ({
  unifiedSearch: (...args: unknown[]) => mockUnifiedSearch(...args),
}));

const searchResults: SearchProjectResult[] = [
  {
    uid: "0x001" as `0x${string}`,
    chainID: 10,
    details: {
      title: "Karma Protocol",
      slug: "karma-protocol",
      description: "Grant tracking",
    },
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    uid: "0x002" as `0x${string}`,
    chainID: 1,
    details: {
      title: "Karma SDK",
      slug: "karma-sdk",
      description: "SDK for attestations",
    },
    createdAt: "2024-02-01T00:00:00Z",
  },
];

describe("useProjectSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("starts in loading state for valid queries", () => {
      mockUnifiedSearch.mockReturnValue(new Promise(() => {}));

      const { result } = renderHookWithProviders(() => useProjectSearch("karma"));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.projects).toEqual([]);
    });
  });

  describe("success state", () => {
    it("returns project results matching the query", async () => {
      mockUnifiedSearch.mockResolvedValue({
        projects: searchResults,
        communities: [],
      });

      const { result } = renderHookWithProviders(() => useProjectSearch("karma"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.projects).toHaveLength(2);
      expect(result.current.projects[0].details.title).toBe("Karma Protocol");
      expect(result.current.projects[1].details.slug).toBe("karma-sdk");
      expect(result.current.isError).toBe(false);
    });

    it("returns empty results when no matches", async () => {
      mockUnifiedSearch.mockResolvedValue({
        projects: [],
        communities: [],
      });

      const { result } = renderHookWithProviders(() => useProjectSearch("zzz-no-match"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.projects).toEqual([]);
    });
  });

  describe("error state", () => {
    it("sets isError when service throws", async () => {
      // The hook uses defaultQueryOptions with retry: shouldRetry (allows 1 retry)
      // so we need to reject twice to exhaust retries
      mockUnifiedSearch
        .mockRejectedValueOnce(new Error("Search API error"))
        .mockRejectedValueOnce(new Error("Search API error"));

      const { result } = renderHookWithProviders(() => useProjectSearch("karma"));

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 10000 }
      );

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("disabled state", () => {
    it("does not fetch when query is shorter than 3 characters", () => {
      const { result } = renderHookWithProviders(() => useProjectSearch("ab"));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.projects).toEqual([]);
      expect(mockUnifiedSearch).not.toHaveBeenCalled();
    });

    it("does not fetch when enabled is false", () => {
      const { result } = renderHookWithProviders(() =>
        useProjectSearch("karma", { enabled: false })
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.projects).toEqual([]);
      expect(mockUnifiedSearch).not.toHaveBeenCalled();
    });

    it("does not fetch for empty string", () => {
      const { result } = renderHookWithProviders(() => useProjectSearch(""));

      expect(result.current.isLoading).toBe(false);
      expect(mockUnifiedSearch).not.toHaveBeenCalled();
    });
  });

  describe("isFetching", () => {
    it("exposes isFetching for background refetch tracking", async () => {
      mockUnifiedSearch.mockResolvedValue({
        projects: searchResults,
        communities: [],
      });

      const { result } = renderHookWithProviders(() => useProjectSearch("karma"));

      // Initially both loading and fetching
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe("service call parameters", () => {
    it("passes the query string to unifiedSearch", async () => {
      mockUnifiedSearch.mockResolvedValue({ projects: [], communities: [] });

      const { result } = renderHookWithProviders(() => useProjectSearch("karma protocol"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockUnifiedSearch).toHaveBeenCalledWith(
        "karma protocol",
        expect.any(Number) // limit
      );
    });
  });
});
