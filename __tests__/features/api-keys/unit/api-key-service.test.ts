import { apiKeyService } from "@/src/features/api-keys/services/api-key.service";

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from "@/utilities/api/client";

const mockApiGet = api.get as unknown as vi.Mock;
const mockApiPost = api.post as unknown as vi.Mock;
const mockApiDelete = api.delete as unknown as vi.Mock;

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
      mockApiGet.mockResolvedValue(mockResponse);

      const result = await apiKeyService.get();

      expect(result).toEqual(mockResponse);
      expect(mockApiGet).toHaveBeenCalledWith(
        expect.stringContaining("api-keys"),
        expect.objectContaining({ schema: expect.anything() })
      );
    });

    it("should throw on error", async () => {
      mockApiGet.mockRejectedValue(new Error("Unauthorized"));

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
      mockApiPost.mockResolvedValue(mockResponse);

      const result = await apiKeyService.create("My Key");

      expect(result).toEqual(mockResponse);
      expect(mockApiPost).toHaveBeenCalledWith(
        expect.stringContaining("api-keys"),
        { name: "My Key" },
        expect.objectContaining({ schema: expect.anything() })
      );
    });

    it("should create API key without name", async () => {
      const mockResponse = {
        key: "karma_abc123",
        keyHint: "...c123",
        name: "Default",
        createdAt: "2026-02-22T00:00:00.000Z",
      };
      mockApiPost.mockResolvedValue(mockResponse);

      const result = await apiKeyService.create();

      expect(result).toEqual(mockResponse);
      expect(mockApiPost).toHaveBeenCalledWith(
        expect.stringContaining("api-keys"),
        {},
        expect.objectContaining({ schema: expect.anything() })
      );
    });

    it("should throw on error", async () => {
      mockApiPost.mockRejectedValue(new Error("Failed to create"));

      await expect(apiKeyService.create("Test")).rejects.toThrow("Failed to create");
    });
  });

  describe("revoke", () => {
    it("should revoke API key successfully", async () => {
      mockApiDelete.mockResolvedValue(undefined);

      await expect(apiKeyService.revoke()).resolves.toBeUndefined();
      expect(mockApiDelete).toHaveBeenCalledWith(expect.stringContaining("api-keys"));
    });

    it("should throw on error", async () => {
      mockApiDelete.mockRejectedValue(new Error("Not found"));

      await expect(apiKeyService.revoke()).rejects.toThrow("Not found");
    });
  });
});
