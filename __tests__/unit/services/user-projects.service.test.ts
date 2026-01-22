/**
 * @file Tests for User Projects Service (V2 API)
 * @description Tests for fetching user-owned projects using V2 endpoint
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { INDEXER } from "@/utilities/indexer";
import {
  fetchMyProjects,
  fetchMyProjectsPaginated,
} from "@/utilities/sdk/projects/fetchMyProjects";

// All mocks are pre-registered in tests/bun-setup.ts
// Access mocks via globalThis.__mocks__
const getMocks = () => (globalThis as any).__mocks__;

describe("User Projects Service (V2)", () => {
  let mockFetchData: any;

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
    const mocks = getMocks();
    mockFetchData = mocks.fetchData;

    // Clear mocks
    if (mockFetchData?.mockClear) mockFetchData.mockClear();
  });

  describe("fetchMyProjects", () => {
    const mockAddress = "0xabcdef1234567890123456789012345678901234" as `0x${string}`;

    it("should fetch user projects successfully", async () => {
      mockFetchData.mockResolvedValue([mockPaginatedResponse, null]);

      const result = await fetchMyProjects(mockAddress);

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.USER.PROJECTS(1, 100),
        "GET",
        {},
        {},
        {},
        true,
        false
      );
      expect(result).toHaveLength(2);
      expect(result[0].details.title).toBe("Test Project 1");
    });

    it("should return empty array when no address provided", async () => {
      const result = await fetchMyProjects(undefined);

      expect(mockFetchData).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("should return empty array when fetch fails", async () => {
      mockFetchData.mockResolvedValue([null, "Unauthorized"]);

      const result = await fetchMyProjects(mockAddress);

      expect(result).toEqual([]);
    });

    it("should handle custom page and limit", async () => {
      mockFetchData.mockResolvedValue([mockPaginatedResponse, null]);

      await fetchMyProjects(mockAddress, 2, 50);

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.USER.PROJECTS(2, 50),
        "GET",
        {},
        {},
        {},
        true,
        false
      );
    });
  });

  describe("fetchMyProjectsPaginated", () => {
    it("should fetch paginated user projects", async () => {
      mockFetchData.mockResolvedValue([mockPaginatedResponse, null]);

      const result = await fetchMyProjectsPaginated(1, 20);

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.USER.PROJECTS(1, 20),
        "GET",
        {},
        {},
        {},
        true,
        false
      );
      expect(result).not.toBeNull();
      expect(result?.projects).toHaveLength(2);
      expect(result?.pagination.total).toBe(2);
    });

    it("should return null when fetch fails", async () => {
      mockFetchData.mockResolvedValue([null, "Unauthorized"]);

      const result = await fetchMyProjectsPaginated();

      expect(result).toBeNull();
    });

    it("should use default pagination values", async () => {
      mockFetchData.mockResolvedValue([mockPaginatedResponse, null]);

      await fetchMyProjectsPaginated();

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.USER.PROJECTS(1, 20),
        "GET",
        {},
        {},
        {},
        true,
        false
      );
    });
  });
});
