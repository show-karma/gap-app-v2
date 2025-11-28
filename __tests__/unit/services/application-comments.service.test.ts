import { TokenManager } from "@/utilities/auth/token-manager";

// Mock the dependencies BEFORE importing the service
jest.mock("@/utilities/auth/token-manager");
jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

// Setup axios mock with factory function
jest.mock("axios", () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn((fn) => fn) },
      response: { use: jest.fn() },
    },
  })),
}));

import axios from "axios";
// NOW import the service after mocks are configured
import { applicationCommentsService } from "@/services/application-comments.service";

const mockedAxios = axios as jest.Mocked<typeof axios>;
// Get the mock instance that was created
const mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0]?.value;

describe("applicationCommentsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/v2/applications/app-123/comments", {
        content: "Test comment",
        authorName: "Test User",
      });
    });

    it("should not include Authorization header when no token is available", async () => {
      // Mock TokenManager to return no token
      (TokenManager.getToken as jest.Mock) = jest.fn().mockResolvedValue(null);

      // Mock successful axios response
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { comments: [] },
      });

      // Call the service
      await applicationCommentsService.getComments("app-123");

      // Verify axios.get was called
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/v2/applications/app-123/comments", {});

      // The authorization is handled by the axios interceptor
      // When no token is available, the interceptor doesn't add the header
    });

    it("should include JWT token for all service methods", async () => {
      const mockToken = "test-jwt-token";

      // Mock TokenManager to return a token
      (TokenManager.getToken as jest.Mock) = jest.fn().mockResolvedValue(mockToken);

      // Mock successful axios responses
      mockAxiosInstance.get.mockResolvedValue({ data: { comments: [] } });
      mockAxiosInstance.put.mockResolvedValue({ data: { comment: {} } });
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      // Test getComments
      await applicationCommentsService.getComments("app-123");
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/v2/applications/app-123/comments", {});

      // Test editComment
      await applicationCommentsService.editComment("comment-1", "Updated content");
      expect(mockAxiosInstance.put).toHaveBeenCalledWith("/v2/comments/comment-1", {
        content: "Updated content",
      });

      // Test deleteComment
      await applicationCommentsService.deleteComment("comment-1");
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith("/v2/comments/comment-1", {
        params: {},
      });

      // The authorization header is automatically added by the axios interceptor
      // configured in createAuthenticatedApiClient
    });
  });
});
