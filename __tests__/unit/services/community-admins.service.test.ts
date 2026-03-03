import type { AxiosInstance } from "axios";

// Mock dependencies BEFORE importing the service
jest.mock("@/utilities/auth/token-manager");
jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

// Create a persistent mock instance using var (hoisted) so it's available in jest.mock factory
var mockAxiosInstance: jest.Mocked<AxiosInstance>;

// Mock api-client
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

// Import the service AFTER all mocks are set up
import { communityAdminsService } from "@/services/community-admins.service";

describe("communityAdminsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("resolveEmailToWallet", () => {
    it("should return a lowercase wallet address for a given email", async () => {
      const mockWallet = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { walletAddress: mockWallet },
      });

      const result = await communityAdminsService.resolveEmailToWallet("alice@example.com");

      expect(result).toBe(mockWallet.toLowerCase());
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/v2/user/resolve-email", {
        email: "alice@example.com",
      });
    });

    it("should include name in the request body when provided", async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { walletAddress: "0x1234567890123456789012345678901234567890" },
      });

      await communityAdminsService.resolveEmailToWallet("alice@example.com", "Alice");

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/v2/user/resolve-email", {
        email: "alice@example.com",
        name: "Alice",
      });
    });

    it("should omit name from the request body when not provided", async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { walletAddress: "0x1234567890123456789012345678901234567890" },
      });

      await communityAdminsService.resolveEmailToWallet("alice@example.com");

      const callArgs = mockAxiosInstance.post.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).not.toHaveProperty("name");
    });

    it("should throw when the API returns an error", async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(new Error("Network error"));

      await expect(communityAdminsService.resolveEmailToWallet("bad@example.com")).rejects.toThrow(
        "Network error"
      );
    });

    it("should return the wallet address in lowercase", async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { walletAddress: "0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF" },
      });

      const result = await communityAdminsService.resolveEmailToWallet("test@example.com");

      expect(result).toBe("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef");
    });
  });
});
