import type { AxiosInstance } from "axios";
import { TokenManager } from "@/utilities/auth/token-manager";

// Mock the dependencies BEFORE importing the service
jest.mock("@/utilities/auth/token-manager");
jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

// Mock fetchData for getComments method (which uses fetchData)
jest.mock("@/utilities/fetchData");

// Create a persistent mock instance using var (hoisted) so it's available in jest.mock factory
var mockAxiosInstance: jest.Mocked<AxiosInstance>;

// Mock api-client for mutations (createComment, editComment, deleteComment)
jest.mock("@/utilities/auth/api-client", () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    request: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
    },
    defaults: {} as any,
    getUri: jest.fn(),
  } as unknown as jest.Mocked<AxiosInstance>;

  mockAxiosInstance = instance;

  return {
    createAuthenticatedApiClient: jest.fn(() => instance),
  };
});

// NOW import the service after mocks are configured
import { applicationCommentsService } from "@/services/application-comments.service";
// Import the mocked module to get access to the mock function
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

describe("applicationCommentsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (mockAxiosInstance) {
      mockAxiosInstance.get?.mockClear();
      mockAxiosInstance.post?.mockClear();
      mockAxiosInstance.put?.mockClear();
      mockAxiosInstance.delete?.mockClear();
    }
  });

  describe("Authentication", () => {
    it("should include JWT token in Authorization header when creating a comment", async () => {
      const mockToken = "test-jwt-token";
      const mockComment = {
        id: "1",
        content: "Test comment",
        authorAddress: "0x123",
        authorName: "Test User",
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };

      // Mock TokenManager to return a token
      (TokenManager.getToken as jest.Mock) = jest.fn().mockResolvedValue(mockToken);

      // Mock successful axios response
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { comment: mockComment },
      });

      // Call the service
      await applicationCommentsService.createComment("app-123", "Test comment", "Test User");

      // Verify axios.post was called with correct parameters
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining("app-123"),
        expect.objectContaining({
          content: "Test comment",
          authorName: "Test User",
        })
      );
    });

    it("should not include Authorization header when no token is available", async () => {
      // Mock TokenManager to return no token
      (TokenManager.getToken as jest.Mock) = jest.fn().mockResolvedValue(null);

      // Mock successful fetchData response for getComments
      mockFetchData.mockResolvedValueOnce([{ comments: [] }, null, null, 200]);

      // Call the service
      await applicationCommentsService.getComments("app-123");

      // Verify fetchData was called (getComments uses fetchData)
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("app-123"), "GET", {}, {});
    });

    it("should include JWT token for all service methods", async () => {
      const mockToken = "test-jwt-token";

      // Mock TokenManager to return a token
      (TokenManager.getToken as jest.Mock) = jest.fn().mockResolvedValue(mockToken);

      // Mock successful responses
      mockFetchData.mockResolvedValue([{ comments: [] }, null, null, 200]);
      mockAxiosInstance.put.mockResolvedValue({ data: { comment: {} } });
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      // Test getComments (uses fetchData)
      await applicationCommentsService.getComments("app-123");
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("app-123"), "GET", {}, {});

      // Test editComment (uses apiClient)
      await applicationCommentsService.editComment("comment-1", "Updated content");
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        expect.stringContaining("comment-1"),
        expect.objectContaining({
          content: "Updated content",
        })
      );

      // Test deleteComment (uses apiClient)
      await applicationCommentsService.deleteComment("comment-1");
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        expect.stringContaining("comment-1"),
        expect.objectContaining({
          params: {},
        })
      );
    });
  });
});
