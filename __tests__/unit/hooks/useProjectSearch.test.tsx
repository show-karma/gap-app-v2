import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useProjectSearch } from "@/hooks/useProjectSearch";
import { unifiedSearch } from "@/services/unified-search.service";

// Mock the unified search service
jest.mock("@/services/unified-search.service", () => ({
  unifiedSearch: jest.fn(),
}));

const mockUnifiedSearch = unifiedSearch as jest.MockedFunction<typeof unifiedSearch>;

// Create wrapper with QueryClient for each test
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useProjectSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("query enabling", () => {
    it("should not fetch with query less than 3 characters", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjectSearch("ab"), { wrapper });

      expect(result.current.projects).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(mockUnifiedSearch).not.toHaveBeenCalled();
    });

    it("should not fetch with empty query", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjectSearch(""), { wrapper });

      expect(result.current.projects).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(mockUnifiedSearch).not.toHaveBeenCalled();
    });

    it("should fetch with query of exactly 3 characters", async () => {
      const mockProjects = [
        {
          uid: "0x1234567890123456789012345678901234567890123456789012345678901234" as `0x${string}`,
          chainID: 1,
          createdAt: "2024-01-01",
          details: { title: "Test Project" },
        },
      ];
      mockUnifiedSearch.mockResolvedValue({
        projects: mockProjects,
        communities: [],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjectSearch("tes"), { wrapper });

      await waitFor(() => {
        expect(result.current.projects).toEqual(mockProjects);
      });
      expect(mockUnifiedSearch).toHaveBeenCalledWith("tes", 10);
    });

    it("should not fetch when disabled option is true", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjectSearch("test", { enabled: false }), {
        wrapper,
      });

      expect(result.current.projects).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(mockUnifiedSearch).not.toHaveBeenCalled();
    });
  });

  describe("successful fetching", () => {
    it("should fetch projects with valid query", async () => {
      const mockProjects = [
        {
          uid: "0x1234567890123456789012345678901234567890123456789012345678901234" as `0x${string}`,
          chainID: 1,
          createdAt: "2024-01-01",
          details: { title: "Test Project", slug: "test-project" },
        },
        {
          uid: "0xabcdef1234567890123456789012345678901234567890123456789012345678" as `0x${string}`,
          chainID: 42161,
          createdAt: "2024-02-01",
          details: { title: "Another Project", slug: "another-project" },
        },
      ];
      mockUnifiedSearch.mockResolvedValue({
        projects: mockProjects,
        communities: [],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjectSearch("test"), {
        wrapper,
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for the query to complete
      await waitFor(() => {
        expect(result.current.projects).toEqual(mockProjects);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(mockUnifiedSearch).toHaveBeenCalledWith("test", 10);
    });

    it("should return only projects, not communities", async () => {
      const mockProjects = [
        {
          uid: "0x1234567890123456789012345678901234567890123456789012345678901234" as `0x${string}`,
          chainID: 1,
          createdAt: "2024-01-01",
          details: { title: "Test Project" },
        },
      ];
      const mockCommunities = [
        {
          uid: "0xcommm567890123456789012345678901234567890123456789012345678901234" as `0x${string}`,
          chainID: 1,
          createdAt: "2024-01-01",
          details: { name: "Test Community" },
        },
      ];
      mockUnifiedSearch.mockResolvedValue({
        projects: mockProjects,
        communities: mockCommunities,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjectSearch("test"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.projects).toEqual(mockProjects);
      });

      // Should only return projects, not communities
      expect(result.current.projects).toHaveLength(1);
      expect(result.current.projects[0].details?.title).toBe("Test Project");
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully", async () => {
      const error = new Error("API Error");
      mockUnifiedSearch.mockRejectedValue(error);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjectSearch("test"), {
        wrapper,
      });

      // Wait longer to account for retry behavior from defaultQueryOptions
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );

      expect(result.current.projects).toEqual([]);
      expect(result.current.error).toBeDefined();
    });

    it("should return empty array when search returns empty results", async () => {
      mockUnifiedSearch.mockResolvedValue({
        projects: [],
        communities: [],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjectSearch("nonexistent"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.projects).toEqual([]);
        expect(result.current.isError).toBe(false);
      });
    });
  });

  describe("refetch functionality", () => {
    it("should provide a refetch function", async () => {
      mockUnifiedSearch.mockResolvedValue({
        projects: [],
        communities: [],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjectSearch("test"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe("function");
    });
  });
});
