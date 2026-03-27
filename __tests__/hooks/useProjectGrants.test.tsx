import { waitFor } from "@testing-library/react";
import { createMockGrant } from "@/__tests__/factories";
import { renderHookWithProviders } from "@/__tests__/utils/render";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";

const mockGetProjectGrants = vi.fn();
vi.mock("@/services/project-grants.service", () => ({
  getProjectGrants: (...args: unknown[]) => mockGetProjectGrants(...args),
}));

// Mock queryClient invalidation used in refetch
vi.mock("@/utilities/query-client", () => ({
  queryClient: {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  },
}));

const grant1 = createMockGrant({
  uid: "0xgrant001" as `0x${string}`,
  details: { title: "Infrastructure Grant" },
});

const grant2 = createMockGrant({
  uid: "0xgrant002" as `0x${string}`,
  details: { title: "Research Grant" },
});

describe("useProjectGrants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("starts in loading state", () => {
      mockGetProjectGrants.mockReturnValue(new Promise(() => {}));

      const { result } = renderHookWithProviders(() => useProjectGrants("test-project"));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.grants).toEqual([]);
    });
  });

  describe("success state", () => {
    it("returns grants array on success", async () => {
      mockGetProjectGrants.mockResolvedValue([grant1, grant2]);

      const { result } = renderHookWithProviders(() => useProjectGrants("test-project"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.grants).toHaveLength(2);
      expect(result.current.grants[0].details?.title).toBe("Infrastructure Grant");
      expect(result.current.grants[1].details?.title).toBe("Research Grant");
      expect(result.current.error).toBeNull();
    });

    it("returns empty array when no grants exist", async () => {
      mockGetProjectGrants.mockResolvedValue([]);

      const { result } = renderHookWithProviders(() => useProjectGrants("test-project"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.grants).toEqual([]);
    });
  });

  describe("error state", () => {
    it("sets error when service throws", async () => {
      mockGetProjectGrants.mockRejectedValue(new Error("API failure"));

      const { result } = renderHookWithProviders(() => useProjectGrants("test-project"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.grants).toEqual([]);
    });
  });

  describe("disabled state", () => {
    it("does not fetch when projectIdOrSlug is empty", () => {
      const { result } = renderHookWithProviders(() => useProjectGrants(""));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.grants).toEqual([]);
      expect(mockGetProjectGrants).not.toHaveBeenCalled();
    });
  });

  describe("cache behavior", () => {
    it("caches data under the correct query key", async () => {
      mockGetProjectGrants.mockResolvedValue([grant1]);

      const { result, queryClient } = renderHookWithProviders(() =>
        useProjectGrants("test-project")
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const cachedData = queryClient.getQueryData(["project-grants", "test-project"]);
      expect(cachedData).toBeDefined();
      expect(cachedData).toHaveLength(1);
    });
  });

  describe("refetch", () => {
    it("re-fetches data when refetch is called", async () => {
      mockGetProjectGrants.mockResolvedValueOnce([grant1]).mockResolvedValueOnce([grant1, grant2]);

      const { result } = renderHookWithProviders(() => useProjectGrants("test-project"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.grants).toHaveLength(1);

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.grants).toHaveLength(2);
      });
    });
  });

  describe("query key isolation", () => {
    it("uses different query keys for different projects", async () => {
      mockGetProjectGrants.mockResolvedValue([grant1]);

      const { result: result1, queryClient } = renderHookWithProviders(() =>
        useProjectGrants("project-a")
      );

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
      });

      expect(queryClient.getQueryData(["project-grants", "project-a"])).toBeDefined();
      expect(queryClient.getQueryData(["project-grants", "project-b"])).toBeUndefined();
    });
  });
});
