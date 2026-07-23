import { authorizationService } from "../services/authorization.service";

vi.mock("@/utilities/api/client", () => ({
  api: { get: vi.fn() },
}));

import { api } from "@/utilities/api/client";

const mockApiGet = api.get as vi.MockedFunction<typeof api.get>;

describe("authorizationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPermissions", () => {
    it("should throw on API error so React Query can retry", async () => {
      const apiError = new Error("Error");
      mockApiGet.mockRejectedValue(apiError);

      await expect(authorizationService.getPermissions()).rejects.toBe(apiError);
    });

    it("should throw on empty response", async () => {
      mockApiGet.mockResolvedValue(null);

      await expect(authorizationService.getPermissions()).rejects.toThrow(
        "Failed to fetch permissions: empty response"
      );
    });

    it("should return parsed permissions from API response", async () => {
      mockApiGet.mockResolvedValue({
        roles: {
          primaryRole: "PROGRAM_ADMIN",
          roles: ["PROGRAM_ADMIN", "APPLICANT"],
          reviewerTypes: [],
        },
        permissions: ["program:view", "program:edit", "application:view_all"],
        resourceContext: {
          programId: "program-123",
        },
        isCommunityAdmin: false,
        isProgramAdmin: true,
        isReviewer: false,
        isRegistryAdmin: false,
        isProgramCreator: false,
      });

      const result = await authorizationService.getPermissions({
        programId: "program-123",
      });

      expect(result.roles.primaryRole).toBe("PROGRAM_ADMIN");
      expect(result.roles.roles).toContain("PROGRAM_ADMIN");
      expect(result.roles.roles).toContain("APPLICANT");
      expect(result.permissions).toContain("program:view");
      expect(result.permissions).toContain("program:edit");
      expect(result.resourceContext.programId).toBe("program-123");
    });

    it("should include reviewer types when present", async () => {
      mockApiGet.mockResolvedValue({
        roles: {
          primaryRole: "PROGRAM_REVIEWER",
          roles: ["PROGRAM_REVIEWER"],
          reviewerTypes: ["PROGRAM"],
        },
        permissions: ["application:review", "application:view_assigned"],
        resourceContext: {
          programId: "program-123",
        },
        isCommunityAdmin: false,
        isProgramAdmin: false,
        isReviewer: true,
        isRegistryAdmin: false,
        isProgramCreator: false,
      });

      const result = await authorizationService.getPermissions({
        programId: "program-123",
      });

      expect(result.roles.reviewerTypes).toContain("PROGRAM");
    });

    it("should pass query parameters to API", async () => {
      mockApiGet.mockResolvedValue({
        roles: { primaryRole: "GUEST", roles: ["GUEST"], reviewerTypes: [] },
        permissions: [],
        resourceContext: {},
        isCommunityAdmin: false,
        isProgramAdmin: false,
        isReviewer: false,
        isRegistryAdmin: false,
        isProgramCreator: false,
      });

      await authorizationService.getPermissions({
        communityId: "community-123",
        programId: "program-456",
        applicationId: "app-789",
        milestoneId: "milestone-012",
        chainId: 10,
      });

      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("communityId=community-123"));
      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("programId=program-456"));
      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("applicationId=app-789"));
      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("milestoneId=milestone-012"));
      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("chainId=10"));
    });

    it("should handle empty params", async () => {
      mockApiGet.mockResolvedValue({
        roles: { primaryRole: "GUEST", roles: ["GUEST"], reviewerTypes: [] },
        permissions: ["community:view", "program:view"],
        resourceContext: {},
        isCommunityAdmin: false,
        isProgramAdmin: false,
        isReviewer: false,
        isRegistryAdmin: false,
        isProgramCreator: false,
      });

      const result = await authorizationService.getPermissions();

      expect(result.roles.primaryRole).toBe("GUEST");
      expect(mockApiGet).toHaveBeenCalledWith("/v2/auth/permissions");
    });

    it("should return isReviewer flag from API response", async () => {
      mockApiGet.mockResolvedValue({
        roles: { primaryRole: "GUEST", roles: ["GUEST"], reviewerTypes: [] },
        permissions: ["community:view", "program:view"],
        resourceContext: { communityId: "optimism" },
        isCommunityAdmin: false,
        isProgramAdmin: false,
        isReviewer: true,
        isRegistryAdmin: false,
        isProgramCreator: false,
      });

      const result = await authorizationService.getPermissions({
        communityId: "optimism",
      });

      expect(result.isReviewer).toBe(true);
      expect(result.roles.primaryRole).toBe("GUEST");
    });

    it("should return boolean flags from API response", async () => {
      mockApiGet.mockResolvedValue({
        roles: {
          primaryRole: "COMMUNITY_ADMIN",
          roles: ["COMMUNITY_ADMIN"],
          reviewerTypes: [],
        },
        permissions: ["community:view", "community:edit"],
        resourceContext: { communityId: "optimism" },
        isCommunityAdmin: true,
        isProgramAdmin: false,
        isReviewer: false,
        isRegistryAdmin: false,
        isProgramCreator: false,
      });

      const result = await authorizationService.getPermissions({
        communityId: "optimism",
      });

      expect(result.isCommunityAdmin).toBe(true);
      expect(result.isProgramAdmin).toBe(false);
      expect(result.isReviewer).toBe(false);
      expect(result.roles.primaryRole).toBe("COMMUNITY_ADMIN");
    });

    it("should coerce missing boolean flags to false", async () => {
      mockApiGet.mockResolvedValue({
        roles: { primaryRole: "GUEST", roles: ["GUEST"], reviewerTypes: [] },
        permissions: [],
        resourceContext: {},
        // Intentionally omit boolean flags to test strict coercion
      });

      const result = await authorizationService.getPermissions();

      expect(result.isCommunityAdmin).toBe(false);
      expect(result.isProgramAdmin).toBe(false);
      expect(result.isReviewer).toBe(false);
      expect(result.isRegistryAdmin).toBe(false);
      expect(result.isProgramCreator).toBe(false);
    });

    it("should coerce truthy non-boolean values to false", async () => {
      mockApiGet.mockResolvedValue({
        roles: { primaryRole: "GUEST", roles: ["GUEST"], reviewerTypes: [] },
        permissions: [],
        resourceContext: {},
        isCommunityAdmin: "yes" as unknown as boolean,
        isProgramAdmin: 1 as unknown as boolean,
        isReviewer: {} as unknown as boolean,
        isRegistryAdmin: null as unknown as boolean,
        isProgramCreator: undefined as unknown as boolean,
      });

      const result = await authorizationService.getPermissions();

      expect(result.isCommunityAdmin).toBe(false);
      expect(result.isProgramAdmin).toBe(false);
      expect(result.isReviewer).toBe(false);
      expect(result.isRegistryAdmin).toBe(false);
      expect(result.isProgramCreator).toBe(false);
    });
  });
});
