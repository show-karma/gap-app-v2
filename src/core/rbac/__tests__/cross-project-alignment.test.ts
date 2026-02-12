import { Permission } from "../types/permission";
import { ROLE_HIERARCHY, Role } from "../types/role";

/**
 * Cross-project alignment tests.
 *
 * These tests verify that the frontend Role and Permission enums stay aligned
 * with the values returned by gap-indexer's /v2/auth/permissions endpoint.
 * If any of these tests fail, the frontend enum definitions have drifted from
 * the backend and must be synchronized.
 */
describe("Cross-Project RBAC Alignment", () => {
  describe("Role alignment with gap-indexer", () => {
    it("should have all roles that gap-indexer returns", () => {
      // These are the roles the backend can return (RoleEnum from gap-indexer)
      const expectedRoles = [
        "SUPER_ADMIN",
        "REGISTRY_ADMIN",
        "COMMUNITY_ADMIN",
        "PROGRAM_ADMIN",
        "PROGRAM_CREATOR",
        "PROGRAM_REVIEWER",
        "MILESTONE_REVIEWER",
        "APPLICANT",
        "GUEST",
        "NONE",
      ];
      const frontendRoles = Object.values(Role);
      for (const expected of expectedRoles) {
        expect(frontendRoles).toContain(expected);
      }
    });

    it("should have matching hierarchy levels with gap-indexer", () => {
      expect(ROLE_HIERARCHY[Role.NONE]).toBe(-1);
      expect(ROLE_HIERARCHY[Role.GUEST]).toBe(0);
      expect(ROLE_HIERARCHY[Role.APPLICANT]).toBe(1);
      expect(ROLE_HIERARCHY[Role.PROGRAM_REVIEWER]).toBe(2);
      expect(ROLE_HIERARCHY[Role.MILESTONE_REVIEWER]).toBe(3);
      expect(ROLE_HIERARCHY[Role.PROGRAM_ADMIN]).toBe(4);
      expect(ROLE_HIERARCHY[Role.PROGRAM_CREATOR]).toBe(5);
      expect(ROLE_HIERARCHY[Role.COMMUNITY_ADMIN]).toBe(6);
      expect(ROLE_HIERARCHY[Role.REGISTRY_ADMIN]).toBe(7);
      expect(ROLE_HIERARCHY[Role.SUPER_ADMIN]).toBe(8);
    });

    it("should have MILESTONE_REVIEWER above PROGRAM_REVIEWER", () => {
      expect(ROLE_HIERARCHY[Role.MILESTONE_REVIEWER]).toBeGreaterThan(
        ROLE_HIERARCHY[Role.PROGRAM_REVIEWER]
      );
    });

    it("should have PROGRAM_CREATOR above PROGRAM_ADMIN", () => {
      expect(ROLE_HIERARCHY[Role.PROGRAM_CREATOR]).toBeGreaterThan(
        ROLE_HIERARCHY[Role.PROGRAM_ADMIN]
      );
    });
  });

  describe("Permission alignment with gap-indexer", () => {
    it("should have all permissions that gap-indexer can return", () => {
      const expectedPermissions = [
        "community:view",
        "community:edit",
        "community:manage_members",
        "community:manage_programs",
        "registry:view",
        "registry:edit",
        "registry:approve",
        "registry:reject",
        "program:view",
        "program:edit",
        "program:manage_admins",
        "program:manage_reviewers",
        "program:view_analytics",
        "application:view_own",
        "application:view_assigned",
        "application:view_all",
        "application:create",
        "application:edit_own",
        "application:read",
        "application:comment",
        "application:review",
        "application:approve",
        "application:reject",
        "application:change_status",
        "milestone:view_own",
        "milestone:view_assigned",
        "milestone:view_all",
        "milestone:submit",
        "milestone:review",
        "milestone:approve",
        "milestone:reject",
        "review:create",
        "review:edit_own",
        "review:view_all",
        "review:delete_own",
        "comment:edit_own",
        "comment:delete_own",
      ];
      const frontendPermissions = Object.values(Permission);
      for (const expected of expectedPermissions) {
        expect(frontendPermissions).toContain(expected);
      }
    });

    it("should use resource:action naming convention for all permissions", () => {
      const frontendPermissions = Object.values(Permission);
      for (const permission of frontendPermissions) {
        expect(permission).toMatch(/^[a-z]+:[a-z_]+$/);
      }
    });

    it("should group permissions by resource domain", () => {
      const frontendPermissions = Object.values(Permission);
      const domains = new Set(frontendPermissions.map((p) => p.split(":")[0]));

      const expectedDomains = [
        "community",
        "registry",
        "program",
        "application",
        "milestone",
        "review",
        "comment",
      ];

      for (const domain of expectedDomains) {
        expect(domains).toContain(domain);
      }
    });
  });
});
