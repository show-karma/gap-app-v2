import type { AxiosInstance } from "axios";
import { TokenManager } from "@/utilities/auth/token-manager";

// Mock dependencies BEFORE importing the service
vi.mock("@/utilities/auth/token-manager");
vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

// Mock the unified api client for GET requests
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

// Create a persistent mock instance using var (hoisted) so it's available in vi.mock factory
var mockAxiosInstance: vi.Mocked<AxiosInstance>;

// Mock api-client for batch POST operations
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
    deleteUri: vi.fn(),
  } as unknown as vi.Mocked<AxiosInstance>;

  mockAxiosInstance = instance;

  return {
    createAuthenticatedApiClient: vi.fn(() => instance),
  };
});

// Import the service AFTER all mocks are set up
import { type PermissionCheckOptions, PermissionsService } from "@/services/permissions.service";
// Import the mocked unified api client
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

const mockApiGet = api.get as vi.Mock;

describe("PermissionsService", () => {
  let service: PermissionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance.post.mockClear();

    // Mock TokenManager
    (TokenManager.getToken as vi.Mock) = vi.fn().mockResolvedValue("test-token");

    service = new PermissionsService();
  });

  describe("checkPermission", () => {
    it("should check permission for a specific action", async () => {
      const options: PermissionCheckOptions = {
        programId: "program-1",
        chainID: 1,
        action: "review_applications",
      };

      const mockResponse = {
        hasPermission: true,
        permissions: ["review_applications", "update_application_status"],
      };

      mockApiGet.mockResolvedValue(mockResponse);

      const result = await service.checkPermission(options);

      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("program-1"));
      expect(result).toEqual(mockResponse);
    });

    it("should check permission without specific action", async () => {
      const options: PermissionCheckOptions = {
        programId: "program-1",
        chainID: 1,
      };

      const mockResponse = {
        hasPermission: true,
        permissions: ["view", "read"],
      };

      mockApiGet.mockResolvedValue(mockResponse);

      const result = await service.checkPermission(options);

      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("check-permission"));
      expect(result).toEqual(mockResponse);
    });

    it("should throw error if programId is missing", async () => {
      const options: PermissionCheckOptions = {};

      await expect(service.checkPermission(options)).rejects.toThrow(
        "Program ID is required for permission check"
      );
    });

    it("should work without chainID (normalized format)", async () => {
      const options: PermissionCheckOptions = {
        programId: "program-1",
      };

      const mockResponse = {
        hasPermission: true,
        permissions: ["view", "read"],
      };

      mockApiGet.mockResolvedValue(mockResponse);

      const result = await service.checkPermission(options);

      expect(result).toEqual(mockResponse);
    });

    it("should return no permission when user lacks access", async () => {
      const options: PermissionCheckOptions = {
        programId: "program-1",
        chainID: 1,
        action: "delete_program",
      };

      const mockResponse = {
        hasPermission: false,
        permissions: [],
      };

      mockApiGet.mockResolvedValue(mockResponse);

      const result = await service.checkPermission(options);

      expect(result.hasPermission).toBe(false);
      expect(result.permissions).toEqual([]);
    });
  });

  describe("getUserPermissions", () => {
    it("should get all user permissions", async () => {
      const mockResponse = {
        permissions: [
          {
            resource: "program-1",
            actions: ["review", "approve"],
            role: "reviewer",
          },
          {
            resource: "program-2",
            actions: ["view"],
            role: "viewer",
          },
        ],
      };

      mockApiGet.mockResolvedValue(mockResponse);

      const result = await service.getUserPermissions();

      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("permissions"));
      expect(result).toEqual(mockResponse);
    });

    it("should get permissions for specific resource", async () => {
      const mockResponse = {
        permissions: [
          {
            resource: "program-1",
            actions: ["review", "approve"],
            role: "reviewer",
          },
        ],
      };

      mockApiGet.mockResolvedValue(mockResponse);

      const result = await service.getUserPermissions("program-1");

      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("resource=program-1"));
      expect(result).toEqual(mockResponse);
    });

    it("should handle empty permissions", async () => {
      const mockResponse = {
        permissions: [],
      };

      mockApiGet.mockResolvedValue(mockResponse);

      const result = await service.getUserPermissions();

      expect(result.permissions).toEqual([]);
    });
  });

  describe("getReviewerPrograms", () => {
    it("should fetch programs where user is reviewer", async () => {
      const mockPrograms = [
        {
          programId: "program-1",
          chainID: 1,
          name: "Test Program 1",
          metadata: {
            status: "active",
          },
          applicationConfig: {},
        },
        {
          programId: "program-2",
          chainID: 1,
          name: "Test Program 2",
          metadata: {
            status: "active",
          },
          applicationConfig: {},
        },
      ];

      mockApiGet.mockResolvedValue(mockPrograms);

      const result = await service.getReviewerPrograms();

      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("my-reviewer-programs"));
      expect(result).toEqual(mockPrograms);
    });

    it("should return empty array when user is not a reviewer", async () => {
      mockApiGet.mockResolvedValue([]);

      const result = await service.getReviewerPrograms();

      expect(result).toEqual([]);
    });
  });

  describe("hasRole", () => {
    it("should return true if user has reviewer role", async () => {
      const mockPrograms = [
        {
          programId: "program-1",
          chainID: 1,
          name: "Test Program",
          metadata: { status: "active" },
          applicationConfig: {},
        },
      ];

      mockApiGet.mockResolvedValue(mockPrograms);

      const result = await service.hasRole("reviewer");

      expect(result).toBe(true);
    });

    it("should return false if user has no reviewer programs", async () => {
      mockApiGet.mockResolvedValue([]);

      const result = await service.hasRole("reviewer");

      expect(result).toBe(false);
    });

    it("should check role for specific resource", async () => {
      const mockResponse = {
        permissions: [
          {
            resource: "program-1",
            actions: ["review"],
            role: "admin",
          },
        ],
      };

      mockApiGet.mockResolvedValue(mockResponse);

      const result = await service.hasRole("admin", "program-1");

      expect(result).toBe(true);
    });

    it("should return false if role does not match", async () => {
      const mockResponse = {
        permissions: [
          {
            resource: "program-1",
            actions: ["view"],
            role: "viewer",
          },
        ],
      };

      mockApiGet.mockResolvedValue(mockResponse);

      const result = await service.hasRole("admin", "program-1");

      expect(result).toBe(false);
    });

    it("should return false for unknown roles without resource", async () => {
      const result = await service.hasRole("unknown");

      expect(result).toBe(false);
    });
  });

  describe("canPerformAction", () => {
    it("should return true if user can perform action", async () => {
      const mockResponse = {
        permissions: [
          {
            resource: "program-1",
            actions: ["review", "approve", "reject"],
            role: "reviewer",
          },
        ],
      };

      mockApiGet.mockResolvedValue(mockResponse);

      const result = await service.canPerformAction("program-1", "approve");

      expect(result).toBe(true);
    });

    it("should return false if user cannot perform action", async () => {
      const mockResponse = {
        permissions: [
          {
            resource: "program-1",
            actions: ["view"],
            role: "viewer",
          },
        ],
      };

      mockApiGet.mockResolvedValue(mockResponse);

      const result = await service.canPerformAction("program-1", "delete");

      expect(result).toBe(false);
    });

    it("should return false if resource not found", async () => {
      const mockResponse = {
        permissions: [
          {
            resource: "program-2",
            actions: ["view"],
            role: "viewer",
          },
        ],
      };

      mockApiGet.mockResolvedValue(mockResponse);

      const result = await service.canPerformAction("program-1", "view");

      expect(result).toBe(false);
    });
  });

  describe("checkMultiplePermissions", () => {
    it("should check permissions for multiple programs using batch endpoint", async () => {
      const programIds = [
        { programId: "program-1", action: "review" },
        { programId: "program-2", action: "approve" },
      ];

      const mockBatchResponse = {
        permissions: [
          {
            programId: "program-1",
            hasPermission: true,
            permissions: ["review", "approve"],
          },
          {
            programId: "program-2",
            hasPermission: false,
            permissions: [],
          },
        ],
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockBatchResponse });

      const result = await service.checkMultiplePermissions(programIds);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/v2/funding-program-configs/batch-check-permissions",
        { programs: programIds }
      );
      expect(result.size).toBe(2);
      expect(result.get("program-1")).toEqual({
        hasPermission: true,
        permissions: ["review", "approve"],
      });
      expect(result.get("program-2")).toEqual({
        hasPermission: false,
        permissions: [],
      });
    });

    it("should fall back to parallel calls if batch endpoint fails", async () => {
      const programIds = [{ programId: "program-1" }, { programId: "program-2" }];

      // Batch endpoint fails
      mockAxiosInstance.post.mockRejectedValue(new Error("Batch endpoint not available"));

      // Individual calls succeed via api.get
      mockApiGet
        .mockResolvedValueOnce({ hasPermission: true, permissions: ["review"] })
        .mockResolvedValueOnce({ hasPermission: false, permissions: [] });

      const result = await service.checkMultiplePermissions(programIds);

      expect(mockApiGet).toHaveBeenCalledTimes(2);
      expect(result.size).toBe(2);
    });

    it("should handle individual call failures in fallback mode", async () => {
      const programIds = [{ programId: "program-1" }, { programId: "program-2" }];

      // Batch endpoint fails
      mockAxiosInstance.post.mockRejectedValue(new Error("Not available"));

      // First call succeeds, second fails
      mockApiGet
        .mockResolvedValueOnce({ hasPermission: true, permissions: ["review"] })
        .mockRejectedValueOnce(
          new HttpError(500, {
            endpoint: "/v2/funding-program-configs/program-2/check-permission",
            method: "GET",
            body: { message: "Permission check failed" },
          })
        );

      const result = await service.checkMultiplePermissions(programIds);

      expect(result.get("program-1")).toEqual({
        hasPermission: true,
        permissions: ["review"],
      });
      expect(result.get("program-2")).toEqual({
        hasPermission: false,
        permissions: [],
      });
    });

    it("should return empty map for empty input", async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { permissions: [] } });

      const result = await service.checkMultiplePermissions([]);

      expect(result.size).toBe(0);
    });
  });
});
