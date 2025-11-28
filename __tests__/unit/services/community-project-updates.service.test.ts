import { errorManager } from "@/components/Utilities/errorManager";
import {
  type FetchCommunityProjectUpdatesParams,
  fetchCommunityProjectUpdates,
} from "@/services/community-project-updates.service";

// Mock dependencies
jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

jest.mock("@/utilities/indexer", () => ({
  INDEXER: {
    COMMUNITY: {
      PROJECT_UPDATES: (communityId: string) => `/communities/${communityId}/project-updates`,
    },
  },
}));

jest.mock("@/components/Utilities/errorManager");

describe("fetchCommunityProjectUpdates", () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
  });

  describe("Successful requests", () => {
    it("should fetch community project updates with default parameters", async () => {
      const mockResponse = {
        updates: [
          {
            id: "update-1",
            projectId: "project-1",
            content: "Test update",
            status: "completed",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        pagination: {
          page: 1,
          limit: 25,
          total: 1,
          totalPages: 1,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue("application/json"),
        },
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await fetchCommunityProjectUpdates({
        communityId: "community-1",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/communities/community-1/project-updates?page=1&limit=25"
      );
      expect(result).toEqual(mockResponse);
    });

    it("should fetch updates with custom pagination", async () => {
      const mockResponse = {
        updates: [],
        pagination: {
          page: 2,
          limit: 50,
          total: 100,
          totalPages: 2,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue("application/json"),
        },
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const params: FetchCommunityProjectUpdatesParams = {
        communityId: "community-1",
        page: 2,
        limit: 50,
      };

      const result = await fetchCommunityProjectUpdates(params);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/communities/community-1/project-updates?page=2&limit=50"
      );
      expect(result).toEqual(mockResponse);
    });

    it("should fetch updates with pending status filter", async () => {
      const mockResponse = {
        updates: [
          {
            id: "update-1",
            status: "pending",
          },
        ],
        pagination: {
          page: 1,
          limit: 25,
          total: 1,
          totalPages: 1,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue("application/json"),
        },
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const params: FetchCommunityProjectUpdatesParams = {
        communityId: "community-1",
        status: "pending",
      };

      const result = await fetchCommunityProjectUpdates(params);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/communities/community-1/project-updates?page=1&limit=25&status=pending"
      );
      expect(result).toEqual(mockResponse);
    });

    it("should fetch updates with completed status filter", async () => {
      const mockResponse = {
        updates: [],
        pagination: {
          page: 1,
          limit: 25,
          total: 0,
          totalPages: 0,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue("application/json"),
        },
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const params: FetchCommunityProjectUpdatesParams = {
        communityId: "community-1",
        status: "completed",
      };

      await fetchCommunityProjectUpdates(params);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/communities/community-1/project-updates?page=1&limit=25&status=completed"
      );
    });

    it('should not include status parameter for "all" status', async () => {
      const mockResponse = {
        updates: [],
        pagination: {
          page: 1,
          limit: 25,
          total: 0,
          totalPages: 0,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue("application/json"),
        },
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const params: FetchCommunityProjectUpdatesParams = {
        communityId: "community-1",
        status: "all",
      };

      await fetchCommunityProjectUpdates(params);

      const fetchCall = mockFetch.mock.calls[0][0];
      expect(fetchCall).not.toContain("status=all");
    });
  });

  describe("Error handling", () => {
    it("should handle HTTP errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: jest.fn().mockResolvedValue("Community not found"),
      });

      await expect(fetchCommunityProjectUpdates({ communityId: "non-existent" })).rejects.toThrow(
        "Failed to fetch community updates: 404 Not Found"
      );

      expect(errorManager).toHaveBeenCalledWith(
        "Community project updates fetch failed",
        expect.any(Error),
        expect.objectContaining({
          communityId: "non-existent",
          statusCode: 404,
          statusText: "Not Found",
        })
      );
    });

    it("should handle errors when reading error response text fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: jest.fn().mockRejectedValue(new Error("Cannot read response")),
      });

      await expect(fetchCommunityProjectUpdates({ communityId: "community-1" })).rejects.toThrow(
        "Failed to fetch community updates: 500 Internal Server Error"
      );

      expect(errorManager).toHaveBeenCalledWith(
        "Community project updates fetch failed",
        expect.any(Error),
        expect.objectContaining({
          errorBody: "Unable to read error response",
        })
      );
    });

    it("should handle non-JSON content-type responses", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue("text/html"),
        },
        json: jest.fn(),
      });

      await expect(fetchCommunityProjectUpdates({ communityId: "community-1" })).rejects.toThrow(
        "Server returned non-JSON response"
      );

      expect(errorManager).toHaveBeenCalledWith(
        "Invalid content-type from community updates endpoint",
        expect.any(Error),
        expect.objectContaining({
          communityId: "community-1",
          contentType: "text/html",
        })
      );
    });

    it("should handle missing content-type header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
        json: jest.fn(),
      });

      await expect(fetchCommunityProjectUpdates({ communityId: "community-1" })).rejects.toThrow(
        "Server returned non-JSON response"
      );
    });

    it("should handle JSON parsing errors", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue("application/json"),
        },
        json: jest.fn().mockRejectedValue(new SyntaxError("Invalid JSON")),
      });

      await expect(fetchCommunityProjectUpdates({ communityId: "community-1" })).rejects.toThrow(
        "Server returned invalid JSON"
      );

      expect(errorManager).toHaveBeenCalledWith(
        "JSON parsing failed for community project updates",
        expect.any(Error),
        expect.objectContaining({
          communityId: "community-1",
          originalError: "Invalid JSON",
        })
      );
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network request failed");
      mockFetch.mockRejectedValue(networkError);

      await expect(fetchCommunityProjectUpdates({ communityId: "community-1" })).rejects.toThrow(
        "Network request failed"
      );

      expect(errorManager).toHaveBeenCalledWith(
        "Unexpected error fetching community project updates",
        networkError,
        expect.objectContaining({
          communityId: "community-1",
          page: 1,
          limit: 25,
          status: "all",
        })
      );
    });

    it("should not double-log already handled errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: jest.fn().mockResolvedValue("Invalid parameters"),
      });

      try {
        await fetchCommunityProjectUpdates({ communityId: "community-1" });
      } catch (_error) {
        // Error should be thrown
      }

      // errorManager should only be called once for the HTTP error
      const calls = (errorManager as jest.Mock).mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toBe("Community project updates fetch failed");
    });

    it("should handle unexpected error types", async () => {
      mockFetch.mockRejectedValue("String error");

      await expect(fetchCommunityProjectUpdates({ communityId: "community-1" })).rejects.toBe(
        "String error"
      );

      expect(errorManager).toHaveBeenCalledWith(
        "Unexpected error fetching community project updates",
        "String error",
        expect.any(Object)
      );
    });
  });

  describe("Parameter handling", () => {
    it("should handle all parameters together", async () => {
      const mockResponse = {
        updates: [],
        pagination: {
          page: 3,
          limit: 10,
          total: 30,
          totalPages: 3,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue("application/json"),
        },
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const params: FetchCommunityProjectUpdatesParams = {
        communityId: "community-123",
        page: 3,
        limit: 10,
        status: "pending",
      };

      await fetchCommunityProjectUpdates(params);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/communities/community-123/project-updates?page=3&limit=10&status=pending"
      );
    });

    it("should handle special characters in communityId", async () => {
      const mockResponse = {
        updates: [],
        pagination: {
          page: 1,
          limit: 25,
          total: 0,
          totalPages: 0,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue("application/json"),
        },
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await fetchCommunityProjectUpdates({
        communityId: "community-with-dashes-123",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/communities/community-with-dashes-123/project-updates?page=1&limit=25"
      );
    });
  });
});
