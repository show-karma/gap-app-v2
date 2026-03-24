import { apiKeyService } from "@/src/features/api-keys/services/api-key.service";

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(),
}));

const mockFetchData = require("@/utilities/fetchData").default;

describe("apiKeyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("get", () => {
    it("should return API key response on success", async () => {
      const mockResponse = {
        apiKey: {
          keyHint: "...abcd",
          name: "Test Key",
          isActive: true,
          createdAt: "2026-02-22T00:00:00.000Z",
          lastUsedAt: null,
        },
      };
      mockFetchData.mockResolvedValue([mockResponse, null]);

      const result = await apiKeyService.get();

      expect(result).toEqual(mockResponse);
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("api-keys"), "GET");
    });

    it("should throw on error", async () => {
      mockFetchData.mockResolvedValue([null, "Unauthorized"]);

      await expect(apiKeyService.get()).rejects.toThrow("Unauthorized");
    });
  });

  describe("create", () => {
    it("should create API key with name", async () => {
      const mockResponse = {
        key: "karma_abc123",
        keyHint: "...c123",
        name: "My Key",
        createdAt: "2026-02-22T00:00:00.000Z",
      };
      mockFetchData.mockResolvedValue([mockResponse, null]);

      const result = await apiKeyService.create("My Key");

      expect(result).toEqual(mockResponse);
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("api-keys"), "POST", {
        name: "My Key",
      });
    });

    it("should create API key without name", async () => {
      const mockResponse = {
        key: "karma_abc123",
        keyHint: "...c123",
        name: "Default",
        createdAt: "2026-02-22T00:00:00.000Z",
      };
      mockFetchData.mockResolvedValue([mockResponse, null]);

      const result = await apiKeyService.create();

      expect(result).toEqual(mockResponse);
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("api-keys"), "POST", {});
    });

    it("should throw on error", async () => {
      mockFetchData.mockResolvedValue([null, "Failed to create"]);

      await expect(apiKeyService.create("Test")).rejects.toThrow("Failed to create");
    });
  });

  describe("revoke", () => {
    it("should revoke API key successfully", async () => {
      mockFetchData.mockResolvedValue([{}, null]);

      await expect(apiKeyService.revoke()).resolves.toBeUndefined();
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("api-keys"), "DELETE");
    });

    it("should throw on error", async () => {
      mockFetchData.mockResolvedValue([null, "Not found"]);

      await expect(apiKeyService.revoke()).rejects.toThrow("Not found");
    });
  });
});
