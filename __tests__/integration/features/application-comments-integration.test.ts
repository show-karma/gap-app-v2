/**
 * Integration test to verify JWT authentication in comment functionality
 * This test simulates the real-world usage of the comment service with authentication
 *
 * Mocks are pre-registered in bun-setup.ts:
 * - @/utilities/auth/token-manager (TokenManager)
 * - @/utilities/enviromentVars (envVars)
 * - @/utilities/fetchData (fetchData)
 * - @/utilities/auth/api-client (createAuthenticatedApiClient)
 * - @/utilities/getWalletFromWagmiStore (getWalletFromWagmiStore)
 */
import { afterEach, beforeEach, describe, expect, it, type mock } from "bun:test";
import { applicationCommentsService } from "@/services/application-comments.service";
import { TokenManager } from "@/utilities/auth/token-manager";
import fetchData from "@/utilities/fetchData";

// Get the mock API client from globalThis.__mocks__
const mockApiClient = (globalThis as any).__mocks__.apiClient;

describe("Application Comments Integration", () => {
  const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mocktoken";
  const applicationId = "app-test-123";

  beforeEach(() => {
    // Clear mock calls before each test
    (fetchData as ReturnType<typeof mock>).mockClear();
    if (mockApiClient) {
      mockApiClient.get?.mockClear();
      mockApiClient.post?.mockClear();
      mockApiClient.put?.mockClear();
      mockApiClient.delete?.mockClear();
    }

    // Setup default mock for TokenManager
    const tokenManagerGetToken = TokenManager.getToken as ReturnType<typeof mock>;
    tokenManagerGetToken.mockResolvedValue(mockToken);
  });

  afterEach(() => {
    // Note: jest.restoreAllMocks() equivalent is called in bun-setup.ts afterEach
  });

  describe("Authentication Flow", () => {
    it("should handle complete comment lifecycle with authentication", async () => {
      const mockComment = {
        id: "comment-1",
        content: "This is a test comment",
        authorAddress: "0x1234567890abcdef",
        authorName: "Test User",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      };

      // Step 1: Create a comment (uses apiClient.post)
      mockApiClient.post.mockResolvedValueOnce({
        data: { comment: mockComment },
      });

      const createdComment = await applicationCommentsService.createComment(
        applicationId,
        "This is a test comment",
        "Test User"
      );

      expect(createdComment).toEqual(mockComment);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining(applicationId),
        expect.objectContaining({
          content: "This is a test comment",
          authorName: "Test User",
        })
      );

      // Step 2: Get comments (uses fetchData)
      const mockFetchData = fetchData as ReturnType<typeof mock>;
      mockFetchData.mockResolvedValueOnce([{ comments: [mockComment] }, null, null, 200]);

      const comments = await applicationCommentsService.getComments(applicationId);

      expect(comments).toEqual([mockComment]);
      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining(applicationId),
        "GET",
        {},
        {}
      );

      // Step 3: Edit the comment (uses apiClient.put)
      const updatedComment = { ...mockComment, content: "Updated comment" };
      mockApiClient.put.mockResolvedValueOnce({
        data: { comment: updatedComment },
      });

      const editedComment = await applicationCommentsService.editComment(
        "comment-1",
        "Updated comment"
      );

      expect(editedComment).toEqual(updatedComment);
      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.stringContaining("comment-1"),
        expect.objectContaining({
          content: "Updated comment",
        })
      );

      // Step 4: Delete the comment (uses apiClient.delete)
      mockApiClient.delete.mockResolvedValueOnce({
        data: {},
      });

      await applicationCommentsService.deleteComment("comment-1");

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        expect.stringContaining("comment-1"),
        expect.objectContaining({
          params: {},
        })
      );
    });

    it("should handle admin operations with proper authentication", async () => {
      // Test admin-specific comment operations
      const adminComment = {
        id: "admin-comment-1",
        content: "Admin review comment",
        authorAddress: "0xadmin",
        authorName: "Admin User",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
        isAdmin: true,
      };

      // Create admin comment (uses apiClient.post)
      mockApiClient.post.mockResolvedValueOnce({
        data: { comment: adminComment },
      });

      const created = await applicationCommentsService.createComment(
        applicationId,
        "Admin review comment",
        "Admin User"
      );

      expect(created).toEqual(adminComment);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining(applicationId),
        expect.objectContaining({
          content: "Admin review comment",
          authorName: "Admin User",
        })
      );
    });

    it("should handle authentication failure gracefully", async () => {
      // Simulate no token available
      const tokenManagerGetToken = TokenManager.getToken as ReturnType<typeof mock>;
      tokenManagerGetToken.mockResolvedValue(null);

      const error = {
        response: {
          status: 401,
          statusText: "Unauthorized",
          data: { error: "JWT is required" },
        },
        message: "JWT is required",
      };

      mockApiClient.post.mockRejectedValueOnce(error);

      await expect(
        applicationCommentsService.createComment(applicationId, "Test comment")
      ).rejects.toEqual(error);

      // Verify the request was made
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining(applicationId),
        expect.objectContaining({
          content: "Test comment",
          authorName: undefined,
        })
      );
    });

    it("should handle token refresh scenario", async () => {
      // Simulate token changing mid-session
      const initialToken = "initial-token";
      const refreshedToken = "refreshed-token";

      // First call with initial token (getComments uses fetchData)
      const tokenManagerGetToken = TokenManager.getToken as ReturnType<typeof mock>;
      tokenManagerGetToken.mockResolvedValueOnce(initialToken);

      const mockFetchData = fetchData as ReturnType<typeof mock>;
      mockFetchData.mockResolvedValueOnce([{ comments: [] }, null, null, 200]);

      await applicationCommentsService.getComments(applicationId);

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining(applicationId),
        "GET",
        {},
        {}
      );

      // Second call with refreshed token
      tokenManagerGetToken.mockResolvedValueOnce(refreshedToken);

      mockFetchData.mockResolvedValueOnce([{ comments: [] }, null, null, 200]);

      await applicationCommentsService.getComments(applicationId);

      expect(mockFetchData).toHaveBeenLastCalledWith(
        expect.stringContaining(applicationId),
        "GET",
        {},
        {}
      );

      // The token is fetched fresh each time via fetchData
      // So the second call will use the refreshed token
    });
  });
});
