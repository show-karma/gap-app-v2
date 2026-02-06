import fetchData from "@/utilities/fetchData";
import { authorizationService } from "../services/authorization.service";
import { ReviewerType, Role } from "../types/role";

jest.mock("@/utilities/fetchData");

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

describe("authorizationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPermissions", () => {
    it("should return default GUEST permissions on error", async () => {
      mockFetchData.mockResolvedValue([null, "Error", null, 500]);

      const result = await authorizationService.getPermissions();

      expect(result.roles.primaryRole).toBe("GUEST");
      expect(result.roles.roles).toContain("GUEST");
      expect(result.permissions).toEqual([]);
      expect(result.resourceContext).toEqual({});
    });

    it("should return parsed permissions from API response", async () => {
      mockFetchData.mockResolvedValue([
        {
          roles: {
            primaryRole: "PROGRAM_ADMIN",
            roles: ["PROGRAM_ADMIN", "APPLICANT"],
            reviewerTypes: [],
          },
          permissions: ["program:view", "program:edit", "application:view_all"],
          resourceContext: {
            programId: "program-123",
          },
        },
        null,
        null,
        200,
      ]);

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
      mockFetchData.mockResolvedValue([
        {
          roles: {
            primaryRole: "PROGRAM_REVIEWER",
            roles: ["PROGRAM_REVIEWER"],
            reviewerTypes: ["PROGRAM"],
          },
          permissions: ["application:review", "application:view_assigned"],
          resourceContext: {
            programId: "program-123",
          },
        },
        null,
        null,
        200,
      ]);

      const result = await authorizationService.getPermissions({
        programId: "program-123",
      });

      expect(result.roles.reviewerTypes).toContain("PROGRAM");
    });

    it("should pass query parameters to API", async () => {
      mockFetchData.mockResolvedValue([
        {
          roles: { primaryRole: "GUEST", roles: ["GUEST"], reviewerTypes: [] },
          permissions: [],
          resourceContext: {},
        },
        null,
        null,
        200,
      ]);

      await authorizationService.getPermissions({
        communityId: "community-123",
        programId: "program-456",
        applicationId: "app-789",
        milestoneId: "milestone-012",
        chainId: 10,
      });

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining("communityId=community-123")
      );
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("programId=program-456"));
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("applicationId=app-789"));
      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining("milestoneId=milestone-012")
      );
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("chainId=10"));
    });

    it("should handle empty params", async () => {
      mockFetchData.mockResolvedValue([
        {
          roles: { primaryRole: "GUEST", roles: ["GUEST"], reviewerTypes: [] },
          permissions: ["community:view", "program:view"],
          resourceContext: {},
        },
        null,
        null,
        200,
      ]);

      const result = await authorizationService.getPermissions();

      expect(result.roles.primaryRole).toBe("GUEST");
      expect(mockFetchData).toHaveBeenCalledWith("/v2/auth/permissions");
    });

    it("should include hasReviewerAccessInCommunity when present", async () => {
      mockFetchData.mockResolvedValue([
        {
          roles: { primaryRole: "GUEST", roles: ["GUEST"], reviewerTypes: [] },
          permissions: ["community:view", "program:view"],
          resourceContext: { communityId: "optimism" },
          hasReviewerAccessInCommunity: true,
        },
        null,
        null,
        200,
      ]);

      const result = await authorizationService.getPermissions({
        communityId: "optimism",
      });

      expect(result.hasReviewerAccessInCommunity).toBe(true);
      expect(result.roles.primaryRole).toBe("GUEST");
    });

    it("should not include hasReviewerAccessInCommunity when not in response", async () => {
      mockFetchData.mockResolvedValue([
        {
          roles: {
            primaryRole: "PROGRAM_REVIEWER",
            roles: ["PROGRAM_REVIEWER"],
            reviewerTypes: ["PROGRAM"],
          },
          permissions: ["application:review"],
          resourceContext: { communityId: "optimism", programId: "program-123" },
        },
        null,
        null,
        200,
      ]);

      const result = await authorizationService.getPermissions({
        communityId: "optimism",
        programId: "program-123",
      });

      expect(result.hasReviewerAccessInCommunity).toBeUndefined();
      expect(result.roles.primaryRole).toBe("PROGRAM_REVIEWER");
    });
  });
});
