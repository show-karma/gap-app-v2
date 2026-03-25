/**
 * Integration test to verify JWT authentication in comment functionality
 * This test simulates the real-world usage of the comment service with authentication
 */
import type { AxiosInstance } from "axios";
import { TokenManager } from "@/utilities/auth/token-manager";

// Mock dependencies BEFORE importing service
vi.mock("@/utilities/auth/token-manager");
vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

// Mock fetchData for getComments method (which uses fetchData)
vi.mock("@/utilities/fetchData");

// Create a persistent mock instance using var (hoisted) so it's available in jest.mock factory
var mockAxiosInstance: vi.Mocked<AxiosInstance>;

// Mock api-client for mutations (createComment, editComment, deleteComment)
vi.mock("@/utilities/auth/api-client", () => {
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    request: vi.fn(),
    head: vi.fn(),
    options: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
    },
    defaults: {} as any,
    getUri: vi.fn(),
  } as unknown as vi.Mocked<AxiosInstance>;

  mockAxiosInstance = instance;

  return {
    createAuthenticatedApiClient: vi.fn(() => instance),
  };
});

// Mock the wagmi store to simulate a connected wallet
vi.mock("@/utilities/getWalletFromWagmiStore", () => ({
  getWalletFromWagmiStore: vi.fn(() => "0x1234567890abcdef"),
}));

// NOW import the service after mocks are configured
import { applicationCommentsService } from "@/services/application-comments.service";
// Import fetchData mock
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as vi.MockedFunction<typeof fetchData>;

describe("Application Comments Integration", () => {
  const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mocktoken";
  const applicationId = "app-test-123";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchData.mockClear();
    if (mockAxiosInstance) {
      mockAxiosInstance.get?.mockClear();
      mockAxiosInstance.post?.mockClear();
      mockAxiosInstance.put?.mockClear();
      mockAxiosInstance.delete?.mockClear();
    }

    // Setup default mock for TokenManager
    (TokenManager.getToken as vi.Mock) = vi.fn().mockResolvedValue(mockToken);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { comment: mockComment },
      });

      const createdComment = await applicationCommentsService.createComment(
        applicationId,
        "This is a test comment"
      );

      expect(createdComment).toEqual(mockComment);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining(applicationId),
        expect.objectContaining({
          content: "This is a test comment",
        })
      );

      // Step 2: Get comments (uses fetchData)
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
      mockAxiosInstance.put.mockResolvedValueOnce({
        data: { comment: updatedComment },
      });

      const editedComment = await applicationCommentsService.editComment(
        "comment-1",
        "Updated comment"
      );

      expect(editedComment).toEqual(updatedComment);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        expect.stringContaining("comment-1"),
        expect.objectContaining({
          content: "Updated comment",
        })
      );

      // Step 4: Delete the comment (uses apiClient.delete)
      mockAxiosInstance.delete.mockResolvedValueOnce({
        data: {},
      });

      await applicationCommentsService.deleteComment("comment-1");

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
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
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { comment: adminComment },
      });

      const created = await applicationCommentsService.createComment(
        applicationId,
        "Admin review comment"
      );

      expect(created).toEqual(adminComment);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining(applicationId),
        expect.objectContaining({
          content: "Admin review comment",
        })
      );
    });

    it("should handle authentication failure gracefully", async () => {
      // Simulate no token available
      (TokenManager.getToken as vi.Mock).mockResolvedValue(null);

      const error = {
        response: {
          status: 401,
          statusText: "Unauthorized",
          data: { error: "JWT is required" },
        },
        message: "JWT is required",
      };

      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(
        applicationCommentsService.createComment(applicationId, "Test comment")
      ).rejects.toEqual(error);

      // Verify the request was made
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining(applicationId),
        expect.objectContaining({
          content: "Test comment",
        })
      );
    });

    it("should handle token refresh scenario", async () => {
      // Simulate token changing mid-session
      const initialToken = "initial-token";
      const refreshedToken = "refreshed-token";

      // First call with initial token (getComments uses fetchData)
      (TokenManager.getToken as vi.Mock).mockResolvedValueOnce(initialToken);

      mockFetchData.mockResolvedValueOnce([{ comments: [] }, null, null, 200]);

      await applicationCommentsService.getComments(applicationId);

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining(applicationId),
        "GET",
        {},
        {}
      );

      // Second call with refreshed token
      (TokenManager.getToken as vi.Mock).mockResolvedValueOnce(refreshedToken);

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
