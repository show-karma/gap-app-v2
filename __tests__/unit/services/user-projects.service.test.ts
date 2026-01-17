/**
 * @file Tests for User Projects Service (V2 API)
 * @description Tests for fetching user-owned projects using V2 endpoint
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import {
  fetchMyProjects,
  fetchMyProjectsPaginated,
} from "@/utilities/sdk/projects/fetchMyProjects";

// Mock fetchData utility
jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(),
}));

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
    jest.clearAllMocks();
  });

  describe("fetchMyProjects", () => {
    const mockAddress = "0xabcdef1234567890123456789012345678901234" as `0x${string}`;

    it("should fetch user projects successfully", async () => {
      (fetchData as jest.Mock).mockResolvedValue([mockPaginatedResponse, null]);

      const result = await fetchMyProjects(mockAddress);

      expect(fetchData).toHaveBeenCalledWith(
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

      expect(fetchData).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("should return empty array when fetch fails", async () => {
      (fetchData as jest.Mock).mockResolvedValue([null, "Unauthorized"]);

      const result = await fetchMyProjects(mockAddress);

      expect(result).toEqual([]);
    });

    it("should handle custom page and limit", async () => {
      (fetchData as jest.Mock).mockResolvedValue([mockPaginatedResponse, null]);

      await fetchMyProjects(mockAddress, 2, 50);

      expect(fetchData).toHaveBeenCalledWith(
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
      (fetchData as jest.Mock).mockResolvedValue([mockPaginatedResponse, null]);

      const result = await fetchMyProjectsPaginated(1, 20);

      expect(fetchData).toHaveBeenCalledWith(
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
      (fetchData as jest.Mock).mockResolvedValue([null, "Unauthorized"]);

      const result = await fetchMyProjectsPaginated();

      expect(result).toBeNull();
    });

    it("should use default pagination values", async () => {
      (fetchData as jest.Mock).mockResolvedValue([mockPaginatedResponse, null]);

      await fetchMyProjectsPaginated();

      expect(fetchData).toHaveBeenCalledWith(
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
