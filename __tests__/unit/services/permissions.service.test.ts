import { beforeEach, describe, expect, it } from "bun:test";

// All mocks are pre-registered in tests/bun-setup.ts
// Access mocks via globalThis.__mocks__

// Import the service AFTER all mocks are set up
import { type PermissionCheckOptions, PermissionsService } from "@/services/permissions.service";

// Get mocks from globalThis
const getMocks = () => (globalThis as any).__mocks__;

describe("PermissionsService", () => {
  let service: PermissionsService;
  let mockFetchData: any;
  let mockApiClient: any;

  beforeEach(() => {
    const mocks = getMocks();
    mockFetchData = mocks.fetchData;
    mockApiClient = mocks.apiClient;

    // Clear mocks
    if (mockFetchData?.mockClear) mockFetchData.mockClear();
    if (mockApiClient?.post?.mockClear) mockApiClient.post.mockClear();

    // Setup default behavior for TokenManager
    if (mocks.TokenManager?.getToken?.mockImplementation) {
      mocks.TokenManager.getToken.mockImplementation(() => Promise.resolve("test-token"));
    }

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

      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      const result = await service.checkPermission(options);

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("program-1"));
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

      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      const result = await service.checkPermission(options);

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("check-permission"));
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

      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

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

      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

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

      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      const result = await service.getUserPermissions();

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("permissions"));
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

      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      const result = await service.getUserPermissions("program-1");

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("resource=program-1"));
      expect(result).toEqual(mockResponse);
    });

    it("should handle empty permissions", async () => {
      const mockResponse = {
        permissions: [],
      };

      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

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

      mockFetchData.mockResolvedValue([mockPrograms, null, null, 200]);

      const result = await service.getReviewerPrograms();

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("my-reviewer-programs"));
      expect(result).toEqual(mockPrograms);
    });

    it("should return empty array when user is not a reviewer", async () => {
      mockFetchData.mockResolvedValue([[], null, null, 200]);

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

      mockFetchData.mockResolvedValue([mockPrograms, null, null, 200]);

      const result = await service.hasRole("reviewer");

      expect(result).toBe(true);
    });

    it("should return false if user has no reviewer programs", async () => {
      mockFetchData.mockResolvedValue([[], null, null, 200]);

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

      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

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

      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

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

      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

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

      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

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

      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

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

      mockApiClient.post.mockResolvedValue({ data: mockBatchResponse });

      const result = await service.checkMultiplePermissions(programIds);

      expect(mockApiClient.post).toHaveBeenCalledWith(
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
      mockApiClient.post.mockRejectedValue(new Error("Batch endpoint not available"));

      // Individual calls succeed via fetchData
      mockFetchData
        .mockResolvedValueOnce([{ hasPermission: true, permissions: ["review"] }, null, null, 200])
        .mockResolvedValueOnce([{ hasPermission: false, permissions: [] }, null, null, 200]);

      const result = await service.checkMultiplePermissions(programIds);

      expect(mockFetchData).toHaveBeenCalledTimes(2);
      expect(result.size).toBe(2);
    });

    it("should handle individual call failures in fallback mode", async () => {
      const programIds = [{ programId: "program-1" }, { programId: "program-2" }];

      // Batch endpoint fails
      mockApiClient.post.mockRejectedValue(new Error("Not available"));

      // First call succeeds, second fails
      mockFetchData
        .mockResolvedValueOnce([{ hasPermission: true, permissions: ["review"] }, null, null, 200])
        .mockResolvedValueOnce([null, "Permission check failed", null, 500]);

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
      mockApiClient.post.mockResolvedValue({ data: { permissions: [] } });

      const result = await service.checkMultiplePermissions([]);

      expect(result.size).toBe(0);
    });
  });
});
