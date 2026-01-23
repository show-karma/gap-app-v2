import { beforeEach, describe, expect, it } from "bun:test";

// All mocks are pre-registered in tests/bun-setup.ts
// Access mocks via globalThis.__mocks__

// Import the service AFTER mocks are set up (they're pre-registered in bun-setup.ts)
import { applicationCommentsService } from "@/services/application-comments.service";

// Get mocks from globalThis
const getMocks = () => (globalThis as any).__mocks__;

describe("applicationCommentsService", () => {
  let mockFetchData: any;
  let mockApiClient: any;

  beforeEach(() => {
    const mocks = getMocks();
    mockFetchData = mocks.fetchData;
    mockApiClient = mocks.apiClient;

    // Clear mocks
    if (mockFetchData?.mockClear) mockFetchData.mockClear();
    if (mockApiClient?.get?.mockClear) mockApiClient.get.mockClear();
    if (mockApiClient?.post?.mockClear) mockApiClient.post.mockClear();
    if (mockApiClient?.put?.mockClear) mockApiClient.put.mockClear();
    if (mockApiClient?.delete?.mockClear) mockApiClient.delete.mockClear();

    // Setup default behavior for TokenManager
    if (mocks.TokenManager?.getToken?.mockImplementation) {
      mocks.TokenManager.getToken.mockImplementation(() => Promise.resolve("test-token"));
    }
  });

  describe("Authentication", () => {
    it("should include JWT token in Authorization header when creating a comment", async () => {
      const mockComment = {
        id: "1",
        content: "Test comment",
        authorAddress: "0x123",
        authorName: "Test User",
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };

      // Mock successful axios response
      mockApiClient.post.mockResolvedValueOnce({
        data: { comment: mockComment },
      });

      // Call the service
      await applicationCommentsService.createComment("app-123", "Test comment", "Test User");

      // Verify axios.post was called with correct parameters
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("app-123"),
        expect.objectContaining({
          content: "Test comment",
          authorName: "Test User",
        })
      );
    });

    it("should not include Authorization header when no token is available", async () => {
      const mocks = getMocks();
      // Mock TokenManager to return no token
      if (mocks.TokenManager?.getToken?.mockImplementation) {
        mocks.TokenManager.getToken.mockImplementation(() => Promise.resolve(null));
      }

      // Mock successful fetchData response for getComments
      mockFetchData.mockResolvedValueOnce([{ comments: [] }, null, null, 200]);

      // Call the service
      await applicationCommentsService.getComments("app-123");

      // Verify fetchData was called (getComments uses fetchData)
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("app-123"), "GET", {}, {});
    });

    it("should include JWT token for all service methods", async () => {
      const mocks = getMocks();
      // Mock TokenManager to return a token
      if (mocks.TokenManager?.getToken?.mockImplementation) {
        mocks.TokenManager.getToken.mockImplementation(() => Promise.resolve("test-jwt-token"));
      }

      // Mock successful responses
      mockFetchData.mockResolvedValue([{ comments: [] }, null, null, 200]);
      mockApiClient.put.mockResolvedValue({ data: { comment: {} } });
      mockApiClient.delete.mockResolvedValue({ data: {} });

      // Test getComments (uses fetchData)
      await applicationCommentsService.getComments("app-123");
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("app-123"), "GET", {}, {});

      // Test editComment (uses apiClient)
      await applicationCommentsService.editComment("comment-1", "Updated content");
      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.stringContaining("comment-1"),
        expect.objectContaining({
          content: "Updated content",
        })
      );

      // Test deleteComment (uses apiClient)
      await applicationCommentsService.deleteComment("comment-1");
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        expect.stringContaining("comment-1"),
        expect.objectContaining({
          params: {},
        })
      );
    });
  });
});
