import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    V2: {
      FUNDING_PROGRAMS: {
        CHECK_PERMISSION: (programId: string, action?: string) =>
          `/v2/funding-program-configs/${programId}/check-permission${action ? `?action=${action}` : ""}`,
        MY_REVIEWER_PROGRAMS: () => "/v2/funding-program-configs/my-reviewer-programs",
        REVIEWERS: (programId: string) => `/v2/funding-program-configs/${programId}/reviewers`,
      },
      USER: {
        PERMISSIONS: (resource?: string) =>
          `/v2/user/permissions${resource ? `?resource=${resource}` : ""}`,
      },
    },
  },
}));

vi.mock("@/utilities/auth/api-client", () => ({
  createAuthenticatedApiClient: () => ({
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@/services/fundingPlatformService", () => ({}));

import { PermissionsService } from "@/services/permissions.service";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

const mockGet = api.get as ReturnType<typeof vi.fn>;

describe("PermissionsService trust tests", () => {
  let service: PermissionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PermissionsService();
  });

  // --- checkPermission ---

  describe("checkPermission", () => {
    it("throws when programId is missing", async () => {
      await expect(service.checkPermission({ action: "review" })).rejects.toThrow(
        "Program ID is required for permission check"
      );
    });

    it("calls api.get with correct endpoint including programId", async () => {
      mockGet.mockResolvedValue({ hasPermission: true, permissions: ["review"] });

      await service.checkPermission({
        programId: "p1",
        action: "review",
      });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("p1"));
    });

    it("returns permission check response", async () => {
      mockGet.mockResolvedValue({ hasPermission: true, permissions: ["review", "approve"] });

      const result = await service.checkPermission({
        programId: "p1",
        action: "review",
      });

      expect(result.hasPermission).toBe(true);
      expect(result.permissions).toContain("review");
    });

    it("throws on api.get error", async () => {
      mockGet.mockRejectedValue(
        new HttpError(403, {
          endpoint: "/v2/funding-program-configs/p1/check-permission",
          method: "GET",
          body: { message: "Forbidden" },
        })
      );

      await expect(service.checkPermission({ programId: "p1" })).rejects.toThrow("Forbidden");
    });
  });

  // --- getUserPermissions ---

  describe("getUserPermissions", () => {
    it("calls api.get with resource param", async () => {
      mockGet.mockResolvedValue({ permissions: [] });

      await service.getUserPermissions("programs");

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("resource=programs"));
    });

    it("returns user permissions response", async () => {
      const perms = {
        permissions: [{ resource: "programs", actions: ["read", "write"], role: "admin" }],
      };
      mockGet.mockResolvedValue(perms);

      const result = await service.getUserPermissions();

      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0].actions).toContain("read");
    });

    it("throws on error", async () => {
      mockGet.mockRejectedValue(
        new HttpError(401, {
          endpoint: "/v2/user/permissions",
          method: "GET",
          body: { message: "Unauthorized" },
        })
      );

      await expect(service.getUserPermissions()).rejects.toThrow("Unauthorized");
    });
  });

  // --- getReviewerPrograms ---

  describe("getReviewerPrograms", () => {
    it("returns programs array", async () => {
      const programs = [
        { programId: "p1", name: "Program 1" },
        { programId: "p2", name: "Program 2" },
      ];
      mockGet.mockResolvedValue(programs);

      const result = await service.getReviewerPrograms();

      expect(result).toEqual(programs);
      expect(result).toHaveLength(2);
    });

    it("throws on error", async () => {
      mockGet.mockRejectedValue(
        new HttpError(500, {
          endpoint: "/v2/funding-program-configs/my-reviewer-programs",
          method: "GET",
          body: { message: "Server Error" },
        })
      );

      await expect(service.getReviewerPrograms()).rejects.toThrow("Server Error");
    });
  });

  // --- hasRole ---

  describe("hasRole", () => {
    it("returns true when reviewer programs exist", async () => {
      mockGet.mockResolvedValue([{ programId: "p1" }]);

      const result = await service.hasRole("reviewer");

      expect(result).toBe(true);
    });

    it("returns false when reviewer programs are empty", async () => {
      mockGet.mockResolvedValue([]);

      const result = await service.hasRole("reviewer");

      expect(result).toBe(false);
    });

    it("checks role against resource permissions when resource provided", async () => {
      mockGet.mockResolvedValue({
        permissions: [{ resource: "program-123", actions: ["review"], role: "admin" }],
      });

      const result = await service.hasRole("admin", "program-123");

      expect(result).toBe(true);
    });

    it("returns false when role does not match", async () => {
      mockGet.mockResolvedValue({
        permissions: [{ resource: "program-123", actions: ["read"], role: "viewer" }],
      });

      const result = await service.hasRole("admin", "program-123");

      expect(result).toBe(false);
    });

    it("returns false for non-reviewer role without resource", async () => {
      const result = await service.hasRole("admin");

      expect(result).toBe(false);
    });
  });

  // --- canPerformAction ---

  describe("canPerformAction", () => {
    it("returns true when action is in permissions", async () => {
      mockGet.mockResolvedValue({
        permissions: [{ resource: "programs", actions: ["read", "write", "delete"] }],
      });

      const result = await service.canPerformAction("programs", "write");

      expect(result).toBe(true);
    });

    it("returns false when action is not in permissions", async () => {
      mockGet.mockResolvedValue({
        permissions: [{ resource: "programs", actions: ["read"] }],
      });

      const result = await service.canPerformAction("programs", "delete");

      expect(result).toBe(false);
    });

    it("returns false when resource is not found", async () => {
      mockGet.mockResolvedValue({ permissions: [] });

      const result = await service.canPerformAction("nonexistent", "read");

      expect(result).toBe(false);
    });
  });
});
