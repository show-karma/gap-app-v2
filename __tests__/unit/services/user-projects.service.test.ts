/**
 * @file Tests for User Projects Service (V2 API)
 * @description Tests for fetching user-owned projects using V2 endpoint
 */

import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import {
  fetchMyProjects,
  fetchMyProjectsPaginated,
} from "@/utilities/sdk/projects/fetchMyProjects";

// Mock the api client
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

const mockApiGet = api.get as vi.Mock;

describe("User Projects Service (V2)", () => {
  const mockProjects = [
    {
      uid: "0x1234567890123456789012345678901234567890123456789012345678901234",
      chainID: 1,
      owner: "0xabcdef1234567890123456789012345678901234",
      details: {
        title: "Test Project 1",
        description: "Test description 1",
        slug: "test-project-1",
      },
      members: [],
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      uid: "0x2345678901234567890123456789012345678901234567890123456789012345",
      chainID: 1,
      owner: "0xabcdef1234567890123456789012345678901234",
      details: {
        title: "Test Project 2",
        description: "Test description 2",
        slug: "test-project-2",
      },
      members: [],
      createdAt: "2024-01-02T00:00:00.000Z",
    },
  ];

  const mockPaginatedResponse = {
    projects: mockProjects,
    pagination: {
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchMyProjects", () => {
    const mockAddress = "0xabcdef1234567890123456789012345678901234" as `0x${string}`;

    it("should fetch user projects successfully", async () => {
      mockApiGet.mockResolvedValue(mockPaginatedResponse);

      const result = await fetchMyProjects(mockAddress);

      expect(mockApiGet).toHaveBeenCalledWith(INDEXER.V2.USER.PROJECTS(1, 100));
      expect(result).toHaveLength(2);
      expect(result[0].details.title).toBe("Test Project 1");
    });

    it("should fetch projects even when no address provided (JWT auth)", async () => {
      mockApiGet.mockResolvedValue(mockPaginatedResponse);

      const result = await fetchMyProjects(undefined);

      expect(mockApiGet).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it("should throw when fetch fails", async () => {
      mockApiGet.mockRejectedValue(new Error("Unauthorized"));

      await expect(fetchMyProjects(mockAddress)).rejects.toThrow("Unauthorized");
    });

    it("should handle custom page and limit", async () => {
      mockApiGet.mockResolvedValue(mockPaginatedResponse);

      await fetchMyProjects(mockAddress, 2, 50);

      expect(mockApiGet).toHaveBeenCalledWith(INDEXER.V2.USER.PROJECTS(2, 50));
    });
  });

  describe("fetchMyProjectsPaginated", () => {
    it("should fetch paginated user projects", async () => {
      mockApiGet.mockResolvedValue(mockPaginatedResponse);

      const result = await fetchMyProjectsPaginated(1, 20);

      expect(mockApiGet).toHaveBeenCalledWith(INDEXER.V2.USER.PROJECTS(1, 20));
      expect(result).not.toBeNull();
      expect(result?.projects).toHaveLength(2);
      expect(result?.pagination.total).toBe(2);
    });

    it("should return null when fetch fails", async () => {
      mockApiGet.mockRejectedValue(new Error("Unauthorized"));

      const result = await fetchMyProjectsPaginated();

      expect(result).toBeNull();
    });

    it("should use default pagination values", async () => {
      mockApiGet.mockResolvedValue(mockPaginatedResponse);

      await fetchMyProjectsPaginated();

      expect(mockApiGet).toHaveBeenCalledWith(INDEXER.V2.USER.PROJECTS(1, 20));
    });
  });
});
