import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { CommunityGrant } from "@/types/v2/community-grant";

// Set up the mock BEFORE importing the hook
// This ensures mock.module() is called before the hook's dependencies are loaded
const mockGetCommunityGrants = jest.fn();
jest.mock("@/services/community-grants.service", () => ({
  getCommunityGrants: mockGetCommunityGrants,
}));

// Dynamic import to ensure the hook loads AFTER the mock is set up
// This is required because Bun's mock.module() must be called before module resolution
const getHook = async () => {
  const { useCommunityGrants } = await import("../useCommunityGrants");
  return useCommunityGrants;
};

describe("useCommunityGrants", () => {
  let queryClient: QueryClient;
  let useCommunityGrants: Awaited<ReturnType<typeof getHook>>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const createMockGrant = (overrides: Partial<CommunityGrant> = {}): CommunityGrant => ({
    uid: "grant-uid-123",
    programId: "program-456",
    title: "Test Grant",
    description: "Test grant description",
    projectUID: "project-uid-789",
    projectTitle: "Test Project",
    projectSlug: "test-project",
    categories: ["DeFi", "Infrastructure"],
    ...overrides,
  });

  beforeAll(async () => {
    useCommunityGrants = await getHook();
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("successful data fetching", () => {
    it("should fetch grants for a community", async () => {
      const mockGrants = [createMockGrant(), createMockGrant({ uid: "grant-2" })];
      mockGetCommunityGrants.mockResolvedValue(mockGrants);

      const { result } = renderHook(() => useCommunityGrants("test-community"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCommunityGrants).toHaveBeenCalledWith("test-community");
      expect(result.current.grants).toEqual(mockGrants);
      expect(result.current.error).toBeNull();
    });

    it("should return empty array when no grants exist", async () => {
      mockGetCommunityGrants.mockResolvedValue([]);

      const { result } = renderHook(() => useCommunityGrants("empty-community"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.grants).toEqual([]);
    });

    it("should handle grants with various categories", async () => {
      const mockGrants = [
        createMockGrant({ categories: [] }),
        createMockGrant({ uid: "grant-2", categories: ["Single Category"] }),
        createMockGrant({
          uid: "grant-3",
          categories: ["Cat1", "Cat2", "Cat3", "Cat4", "Cat5"],
        }),
      ];
      mockGetCommunityGrants.mockResolvedValue(mockGrants);

      const { result } = renderHook(() => useCommunityGrants("test-community"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.grants).toHaveLength(3);
      expect(result.current.grants[0].categories).toEqual([]);
      expect(result.current.grants[1].categories).toEqual(["Single Category"]);
      expect(result.current.grants[2].categories).toHaveLength(5);
    });
  });

  describe("loading state", () => {
    it("should have loading state while fetching", async () => {
      mockGetCommunityGrants.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([createMockGrant()]), 100))
      );

      const { result } = renderHook(() => useCommunityGrants("test-community"), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.grants).toEqual([]);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.grants).toHaveLength(1);
    });
  });

  describe("error handling", () => {
    it("should handle fetch errors", async () => {
      mockGetCommunityGrants.mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() => useCommunityGrants("test-community"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.grants).toEqual([]);
    });
  });

  describe("enabled state", () => {
    it("should not fetch when communitySlug is empty", () => {
      const { result } = renderHook(() => useCommunityGrants(""), {
        wrapper,
      });

      expect(mockGetCommunityGrants).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.grants).toEqual([]);
    });

    it("should fetch when communitySlug is provided", async () => {
      mockGetCommunityGrants.mockResolvedValue([createMockGrant()]);

      const { result } = renderHook(() => useCommunityGrants("optimism"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCommunityGrants).toHaveBeenCalledWith("optimism");
    });
  });

  describe("refetch functionality", () => {
    it("should provide refetch function", async () => {
      mockGetCommunityGrants.mockResolvedValue([createMockGrant()]);

      const { result } = renderHook(() => useCommunityGrants("test-community"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe("function");

      // Trigger refetch
      await result.current.refetch();

      expect(mockGetCommunityGrants).toHaveBeenCalledTimes(2);
    });
  });

  describe("caching", () => {
    it("should use cache on subsequent renders", async () => {
      const mockGrants = [createMockGrant()];
      mockGetCommunityGrants.mockResolvedValue(mockGrants);

      const { result, rerender } = renderHook(() => useCommunityGrants("test-community"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCommunityGrants).toHaveBeenCalledTimes(1);

      // Rerender - should use cache
      rerender();

      expect(mockGetCommunityGrants).toHaveBeenCalledTimes(1);
      expect(result.current.grants).toEqual(mockGrants);
    });

    it("should fetch again when communitySlug changes", async () => {
      mockGetCommunityGrants.mockResolvedValue([createMockGrant()]);

      const { result, rerender } = renderHook(({ slug }) => useCommunityGrants(slug), {
        wrapper,
        initialProps: { slug: "community-1" },
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCommunityGrants).toHaveBeenCalledWith("community-1");

      // Change community slug
      rerender({ slug: "community-2" });

      await waitFor(() => {
        expect(mockGetCommunityGrants).toHaveBeenCalledWith("community-2");
      });

      expect(mockGetCommunityGrants).toHaveBeenCalledTimes(2);
    });
  });

  describe("query key", () => {
    it("should use correct query key structure", async () => {
      mockGetCommunityGrants.mockResolvedValue([]);

      const { result } = renderHook(() => useCommunityGrants("test-slug"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify the query is cached with the right key
      const cachedData = queryClient.getQueryData(["community-grants", "test-slug"]);
      expect(cachedData).toEqual([]);
    });
  });
});
