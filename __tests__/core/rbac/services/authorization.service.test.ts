import { errorManager } from "@/components/Utilities/errorManager";
import { authorizationService } from "@/src/core/rbac/services/authorization.service";
import { Permission, ReviewerType, Role } from "@/src/core/rbac/types";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

vi.mock("@/utilities/fetchData");
vi.mock("@/components/Utilities/errorManager");

const mockedFetchData = vi.mocked(fetchData);
const mockedErrorManager = vi.mocked(errorManager);

interface ApiResponseOverrides {
  roles?: {
    primaryRole?: string;
    roles?: string[];
    reviewerTypes?: string[];
  };
  permissions?: string[];
  resourceContext?: {
    communityId?: string;
    programId?: string;
    applicationId?: string;
    milestoneId?: string;
  };
  isCommunityAdmin?: boolean;
  isProgramAdmin?: boolean;
  isReviewer?: boolean;
  isRegistryAdmin?: boolean;
  isProgramCreator?: boolean;
  isProjectOwner?: boolean;
  isProjectAdmin?: boolean;
}

const createApiResponse = (overrides: ApiResponseOverrides = {}) => ({
  roles: {
    primaryRole: Role.COMMUNITY_ADMIN,
    roles: [Role.COMMUNITY_ADMIN, Role.APPLICANT],
    reviewerTypes: [ReviewerType.PROGRAM],
    ...overrides.roles,
  },
  permissions: overrides.permissions ?? [Permission.PROJECT_VIEW, Permission.PROJECT_EDIT],
  resourceContext: overrides.resourceContext ?? { communityId: "comm-1" },
  isCommunityAdmin: overrides.isCommunityAdmin ?? true,
  isProgramAdmin: overrides.isProgramAdmin ?? false,
  isReviewer: overrides.isReviewer ?? false,
  isRegistryAdmin: overrides.isRegistryAdmin ?? false,
  isProgramCreator: overrides.isProgramCreator ?? false,
  isProjectOwner: overrides.isProjectOwner ?? false,
  isProjectAdmin: overrides.isProjectAdmin ?? false,
});

// Mirrors the fetchData success tuple [data, null, pageInfo, status].
const okTuple = (data: unknown) => [data, null, null, 200] as never;
// Mirrors the fetchData failure tuple [null, error, null, status].
const errTuple = (error: unknown) => [null, error, null, 500] as never;

describe("authorizationService.getPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("success", () => {
    it("maps roles, permissions, resourceContext, and boolean flags from the API response", async () => {
      const apiResponse = createApiResponse({
        permissions: [Permission.PROJECT_VIEW, Permission.MILESTONE_EDIT],
        resourceContext: { communityId: "comm-1", programId: "prog-9" },
        isProgramAdmin: true,
        isReviewer: true,
        isRegistryAdmin: true,
        isProgramCreator: true,
      });
      mockedFetchData.mockResolvedValue(okTuple(apiResponse));

      const result = await authorizationService.getPermissions({ communityId: "comm-1" });

      expect(result.roles.primaryRole).toBe(Role.COMMUNITY_ADMIN);
      expect(result.roles.roles).toEqual([Role.COMMUNITY_ADMIN, Role.APPLICANT]);
      expect(result.roles.reviewerTypes).toEqual([ReviewerType.PROGRAM]);
      expect(result.permissions).toEqual([Permission.PROJECT_VIEW, Permission.MILESTONE_EDIT]);
      expect(result.resourceContext).toEqual({ communityId: "comm-1", programId: "prog-9" });
      expect(result.isCommunityAdmin).toBe(true);
      expect(result.isProgramAdmin).toBe(true);
      expect(result.isReviewer).toBe(true);
      expect(result.isRegistryAdmin).toBe(true);
      expect(result.isProgramCreator).toBe(true);
    });

    it("maps isProjectOwner and isProjectAdmin from the API response", async () => {
      mockedFetchData.mockResolvedValue(
        okTuple(createApiResponse({ isProjectOwner: true, isProjectAdmin: true }))
      );

      const result = await authorizationService.getPermissions({ projectId: "0xproj" });

      expect(result.isProjectOwner).toBe(true);
      expect(result.isProjectAdmin).toBe(true);
    });

    it("forwards the params to INDEXER.V2.AUTH.PERMISSIONS as the request endpoint", async () => {
      mockedFetchData.mockResolvedValue(okTuple(createApiResponse()));
      const params = { communityId: "comm-1", chainId: 10 };

      await authorizationService.getPermissions(params);

      expect(mockedFetchData).toHaveBeenCalledWith(INDEXER.V2.AUTH.PERMISSIONS(params));
    });

    it("defaults to empty params when called with no arguments", async () => {
      mockedFetchData.mockResolvedValue(okTuple(createApiResponse()));

      await authorizationService.getPermissions();

      expect(mockedFetchData).toHaveBeenCalledWith(INDEXER.V2.AUTH.PERMISSIONS({}));
    });

    it("does not invoke errorManager on a successful response", async () => {
      mockedFetchData.mockResolvedValue(okTuple(createApiResponse()));

      await authorizationService.getPermissions();

      expect(mockedErrorManager).not.toHaveBeenCalled();
    });
  });

  describe("validity guards — never trusts unknown values", () => {
    it("falls back primaryRole to GUEST when the API returns an unknown role", async () => {
      mockedFetchData.mockResolvedValue(
        okTuple(
          createApiResponse({
            roles: { primaryRole: "WIZARD_KING", roles: [Role.APPLICANT] },
          })
        )
      );

      const result = await authorizationService.getPermissions();

      expect(result.roles.primaryRole).toBe(Role.GUEST);
    });

    it("filters out unknown roles from the roles array", async () => {
      mockedFetchData.mockResolvedValue(
        okTuple(
          createApiResponse({
            roles: {
              primaryRole: Role.APPLICANT,
              roles: [Role.APPLICANT, "ROOT", Role.COMMUNITY_ADMIN, "GOD_MODE"],
            },
          })
        )
      );

      const result = await authorizationService.getPermissions();

      expect(result.roles.roles).toEqual([Role.APPLICANT, Role.COMMUNITY_ADMIN]);
    });

    it("falls back roles to [GUEST] when no valid role survives filtering", async () => {
      mockedFetchData.mockResolvedValue(
        okTuple(
          createApiResponse({
            roles: { primaryRole: Role.APPLICANT, roles: ["FOO", "BAR"] },
          })
        )
      );

      const result = await authorizationService.getPermissions();

      expect(result.roles.roles).toEqual([Role.GUEST]);
    });

    it("filters out unknown permissions, keeping only valid Permission values", async () => {
      mockedFetchData.mockResolvedValue(
        okTuple(
          createApiResponse({
            permissions: [
              Permission.PROJECT_VIEW,
              "project:delete_everything",
              Permission.MILESTONE_APPROVE,
              "*",
            ],
          })
        )
      );

      const result = await authorizationService.getPermissions();

      expect(result.permissions).toEqual([Permission.PROJECT_VIEW, Permission.MILESTONE_APPROVE]);
      expect(result.permissions).not.toContain("*");
    });

    it("filters out unknown reviewer types", async () => {
      mockedFetchData.mockResolvedValue(
        okTuple(
          createApiResponse({
            roles: {
              primaryRole: Role.PROGRAM_REVIEWER,
              roles: [Role.PROGRAM_REVIEWER],
              reviewerTypes: [ReviewerType.PROGRAM, "SUPER", ReviewerType.MILESTONE],
            },
          })
        )
      );

      const result = await authorizationService.getPermissions();

      expect(result.roles.reviewerTypes).toEqual([ReviewerType.PROGRAM, ReviewerType.MILESTONE]);
    });

    it("returns empty reviewerTypes when the API omits the field", async () => {
      // Build a response whose roles object truly has no reviewerTypes key.
      const apiResponse = {
        ...createApiResponse(),
        roles: { primaryRole: Role.APPLICANT, roles: [Role.APPLICANT] },
      };
      mockedFetchData.mockResolvedValue(okTuple(apiResponse));

      const result = await authorizationService.getPermissions();

      expect(result.roles.reviewerTypes).toEqual([]);
    });
  });

  describe("boolean coercion — only literal true is trusted", () => {
    it("coerces truthy-but-not-true flag values to false", async () => {
      // Backend contract is strict boolean; anything other than `true` must
      // fail closed rather than be coerced to a privileged state.
      const apiResponse = {
        ...createApiResponse(),
        isCommunityAdmin: "true",
        isProgramAdmin: 1,
        isRegistryAdmin: {},
      };
      mockedFetchData.mockResolvedValue(okTuple(apiResponse));

      const result = await authorizationService.getPermissions();

      expect(result.isCommunityAdmin).toBe(false);
      expect(result.isProgramAdmin).toBe(false);
      expect(result.isRegistryAdmin).toBe(false);
    });
  });

  describe("error path — fails by throwing (never silently grants guest)", () => {
    it("throws and reports when fetchData returns an error", async () => {
      const fetchError = "network down";
      mockedFetchData.mockResolvedValue(errTuple(fetchError));

      await expect(authorizationService.getPermissions({ communityId: "c" })).rejects.toBe(
        fetchError
      );
      expect(mockedErrorManager).toHaveBeenCalledTimes(1);
      expect(mockedErrorManager).toHaveBeenCalledWith(
        "Failed to fetch user permissions",
        fetchError,
        expect.objectContaining({ context: "authorization.service.getPermissions" })
      );
    });

    it("throws an Error when the response is empty without an explicit error", async () => {
      mockedFetchData.mockResolvedValue(okTuple(null));

      await expect(authorizationService.getPermissions()).rejects.toThrow(
        "Failed to fetch permissions: empty response"
      );
      expect(mockedErrorManager).toHaveBeenCalledTimes(1);
    });

    it("does not return DEFAULT_GUEST_PERMISSIONS on error (must reject, not resolve)", async () => {
      mockedFetchData.mockResolvedValue(errTuple(new Error("boom")));

      const settled = await authorizationService
        .getPermissions()
        .then(() => "resolved")
        .catch(() => "rejected");

      expect(settled).toBe("rejected");
    });

    it("propagates the rejection if fetchData itself throws", async () => {
      mockedFetchData.mockRejectedValue(new Error("unexpected"));

      await expect(authorizationService.getPermissions()).rejects.toThrow("unexpected");
    });
  });
});
