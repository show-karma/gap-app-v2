import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utilities/fetchData", () => ({
  default: vi.fn(),
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

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://indexer.example.com",
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
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as ReturnType<typeof vi.fn>;

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

    it("calls fetchData with correct endpoint including programId", async () => {
      mockFetchData.mockResolvedValue([
        { hasPermission: true, permissions: ["review"] },
        null,
        null,
        200,
      ]);

      await service.checkPermission({
        programId: "p1",
        action: "review",
      });

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("p1"));
    });

    it("returns permission check response", async () => {
      mockFetchData.mockResolvedValue([
        { hasPermission: true, permissions: ["review", "approve"] },
        null,
        null,
        200,
      ]);

      const result = await service.checkPermission({
        programId: "p1",
        action: "review",
      });

      expect(result.hasPermission).toBe(true);
      expect(result.permissions).toContain("review");
    });

    it("throws on fetchData error", async () => {
      mockFetchData.mockResolvedValue([null, "Forbidden", null, 403]);

      await expect(service.checkPermission({ programId: "p1" })).rejects.toThrow("Forbidden");
    });
  });

  // --- getUserPermissions ---

  describe("getUserPermissions", () => {
    it("calls fetchData with resource param", async () => {
      mockFetchData.mockResolvedValue([{ permissions: [] }, null, null, 200]);

      await service.getUserPermissions("programs");

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("resource=programs"));
    });

    it("returns user permissions response", async () => {
      const perms = {
        permissions: [{ resource: "programs", actions: ["read", "write"], role: "admin" }],
      };
      mockFetchData.mockResolvedValue([perms, null, null, 200]);

      const result = await service.getUserPermissions();

      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0].actions).toContain("read");
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Unauthorized", null, 401]);

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
      mockFetchData.mockResolvedValue([programs, null, null, 200]);

      const result = await service.getReviewerPrograms();

      expect(result).toEqual(programs);
      expect(result).toHaveLength(2);
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Server Error", null, 500]);

      await expect(service.getReviewerPrograms()).rejects.toThrow("Server Error");
    });
  });

  // --- hasRole ---

  describe("hasRole", () => {
    it("returns true when reviewer programs exist", async () => {
      mockFetchData.mockResolvedValue([[{ programId: "p1" }], null, null, 200]);

      const result = await service.hasRole("reviewer");

      expect(result).toBe(true);
    });

    it("returns false when reviewer programs are empty", async () => {
      mockFetchData.mockResolvedValue([[], null, null, 200]);

      const result = await service.hasRole("reviewer");

      expect(result).toBe(false);
    });

    it("checks role against resource permissions when resource provided", async () => {
      mockFetchData.mockResolvedValue([
        {
          permissions: [{ resource: "program-123", actions: ["review"], role: "admin" }],
        },
        null,
        null,
        200,
      ]);

      const result = await service.hasRole("admin", "program-123");

      expect(result).toBe(true);
    });

    it("returns false when role does not match", async () => {
      mockFetchData.mockResolvedValue([
        {
          permissions: [{ resource: "program-123", actions: ["read"], role: "viewer" }],
        },
        null,
        null,
        200,
      ]);

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
      mockFetchData.mockResolvedValue([
        {
          permissions: [{ resource: "programs", actions: ["read", "write", "delete"] }],
        },
        null,
        null,
        200,
      ]);

      const result = await service.canPerformAction("programs", "write");

      expect(result).toBe(true);
    });

    it("returns false when action is not in permissions", async () => {
      mockFetchData.mockResolvedValue([
        {
          permissions: [{ resource: "programs", actions: ["read"] }],
        },
        null,
        null,
        200,
      ]);

      const result = await service.canPerformAction("programs", "delete");

      expect(result).toBe(false);
    });

    it("returns false when resource is not found", async () => {
      mockFetchData.mockResolvedValue([{ permissions: [] }, null, null, 200]);

      const result = await service.canPerformAction("nonexistent", "read");

      expect(result).toBe(false);
    });
  });
});
