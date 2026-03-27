import type { AxiosInstance } from "axios";

// Mock dependencies BEFORE importing the service
vi.mock("@/utilities/auth/token-manager");
vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

// Create a persistent mock instance using var (hoisted) so it's available in vi.mock factory
var mockAxiosInstance: vi.Mocked<AxiosInstance>;

// Mock api-client
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

// Import the service AFTER all mocks are set up
import { communityAdminsService } from "@/services/community-admins.service";

describe("communityAdminsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
