import { waitFor } from "@testing-library/react";
import { createMockProject } from "@/__tests__/factories";
import { renderHookWithProviders } from "@/__tests__/utils/render";
import { useCommunityProjects } from "@/hooks/v2/useCommunityProjects";
import type { CommunityProjects } from "@/types/v2/community";

const mockGetCommunityProjects = vi.fn();
vi.mock("@/utilities/queries/v2/getCommunityData", () => ({
  getCommunityProjects: (...args: unknown[]) => mockGetCommunityProjects(...args),
}));

function createPaginatedResponse(
  projects: ReturnType<typeof createMockProject>[],
  page = 1,
  limit = 12
): CommunityProjects {
  return {
    payload: projects,
    pagination: {
      totalCount: projects.length,
      page,
      limit,
      totalPages: Math.ceil(projects.length / limit) || 1,
      nextPage: null,
      prevPage: page > 1 ? page - 1 : null,
      hasNextPage: false,
      hasPrevPage: page > 1,
    },
  };
}

describe("useCommunityProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("starts in loading state", () => {
      mockGetCommunityProjects.mockReturnValue(new Promise(() => {}));

      const { result } = renderHookWithProviders(() => useCommunityProjects("test-community"));

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("success state", () => {
    it("returns community projects with pagination", async () => {
      const projects = [
        createMockProject({ details: { title: "Project Alpha", slug: "alpha" } }),
        createMockProject({ details: { title: "Project Beta", slug: "beta" } }),
      ];

      mockGetCommunityProjects.mockResolvedValue(createPaginatedResponse(projects));

      const { result } = renderHookWithProviders(() => useCommunityProjects("test-community"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.payload).toHaveLength(2);
      expect(result.current.data?.pagination.totalCount).toBe(2);
      expect(result.current.isError).toBe(false);
    });

    it("returns empty payload when community has no projects", async () => {
      mockGetCommunityProjects.mockResolvedValue(createPaginatedResponse([]));

      const { result } = renderHookWithProviders(() => useCommunityProjects("empty-community"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.payload).toEqual([]);
      expect(result.current.data?.pagination.totalCount).toBe(0);
    });
  });

  describe("options forwarding", () => {
    it("passes page and limit options to service", async () => {
      mockGetCommunityProjects.mockResolvedValue(createPaginatedResponse([], 2, 5));

      const { result } = renderHookWithProviders(() =>
        useCommunityProjects("test-community", { page: 2, limit: 5 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCommunityProjects).toHaveBeenCalledWith(
        "test-community",
        expect.objectContaining({ page: 2, limit: 5 })
      );
    });

    it("passes sortBy option", async () => {
      mockGetCommunityProjects.mockResolvedValue(createPaginatedResponse([]));

      const { result } = renderHookWithProviders(() =>
        useCommunityProjects("test-community", { sortBy: "createdAt" })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCommunityProjects).toHaveBeenCalledWith(
        "test-community",
        expect.objectContaining({ sortBy: "createdAt" })
      );
    });

    it("passes selectedProgramId filter", async () => {
      mockGetCommunityProjects.mockResolvedValue(createPaginatedResponse([]));

      const { result } = renderHookWithProviders(() =>
        useCommunityProjects("test-community", {
          selectedProgramId: "program-123",
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCommunityProjects).toHaveBeenCalledWith(
        "test-community",
        expect.objectContaining({ selectedProgramId: "program-123" })
      );
    });
  });

  describe("error state", () => {
    it("sets isError when service throws", async () => {
      mockGetCommunityProjects.mockRejectedValue(new Error("Network error"));

      const { result } = renderHookWithProviders(() => useCommunityProjects("test-community"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("disabled state", () => {
    it("does not fetch when slug is empty", () => {
      const { result } = renderHookWithProviders(() => useCommunityProjects(""));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockGetCommunityProjects).not.toHaveBeenCalled();
    });
  });

  describe("pagination metadata", () => {
    it("returns correct pagination info for multi-page results", async () => {
      const response: CommunityProjects = {
        payload: [createMockProject()],
        pagination: {
          totalCount: 30,
          page: 2,
          limit: 10,
          totalPages: 3,
          nextPage: 3,
          prevPage: 1,
          hasNextPage: true,
          hasPrevPage: true,
        },
      };

      mockGetCommunityProjects.mockResolvedValue(response);

      const { result } = renderHookWithProviders(() =>
        useCommunityProjects("test-community", { page: 2, limit: 10 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const pagination = result.current.data?.pagination;
      expect(pagination?.totalCount).toBe(30);
      expect(pagination?.page).toBe(2);
      expect(pagination?.totalPages).toBe(3);
      expect(pagination?.hasNextPage).toBe(true);
      expect(pagination?.hasPrevPage).toBe(true);
    });
  });
});
