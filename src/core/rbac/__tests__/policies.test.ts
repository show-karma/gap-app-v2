import {
  getPermissionsForRoles,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  PERMISSION_MATRIX,
} from "../policies/permission-matrix";
import { Permission } from "../types/permission";
import { Role } from "../types/role";

describe("RBAC Policies", () => {
  describe("PERMISSION_MATRIX", () => {
    it("should have entries for all roles", () => {
      expect(PERMISSION_MATRIX[Role.SUPER_ADMIN]).toBeDefined();
      expect(PERMISSION_MATRIX[Role.REGISTRY_ADMIN]).toBeDefined();
      expect(PERMISSION_MATRIX[Role.COMMUNITY_ADMIN]).toBeDefined();
      expect(PERMISSION_MATRIX[Role.PROGRAM_ADMIN]).toBeDefined();
      expect(PERMISSION_MATRIX[Role.PROGRAM_CREATOR]).toBeDefined();
      expect(PERMISSION_MATRIX[Role.PROGRAM_REVIEWER]).toBeDefined();
      expect(PERMISSION_MATRIX[Role.MILESTONE_REVIEWER]).toBeDefined();
      expect(PERMISSION_MATRIX[Role.APPLICANT]).toBeDefined();
      expect(PERMISSION_MATRIX[Role.GUEST]).toBeDefined();
    });

    it("should assign global wildcard to SUPER_ADMIN", () => {
      expect(PERMISSION_MATRIX[Role.SUPER_ADMIN]).toContain("*");
    });

    it("should NOT assign global wildcard to REGISTRY_ADMIN", () => {
      expect(PERMISSION_MATRIX[Role.REGISTRY_ADMIN]).not.toContain("*");
    });

    it("should assign registry wildcard and PROGRAM_VIEW to REGISTRY_ADMIN", () => {
      expect(PERMISSION_MATRIX[Role.REGISTRY_ADMIN]).toContain("registry:*");
      expect(PERMISSION_MATRIX[Role.REGISTRY_ADMIN]).toContain(Permission.PROGRAM_VIEW);
    });

    it("should assign view permissions to GUEST", () => {
      expect(PERMISSION_MATRIX[Role.GUEST]).toContain(Permission.PROGRAM_VIEW);
      expect(PERMISSION_MATRIX[Role.GUEST]).toContain(Permission.APPLICATION_READ);
      expect(PERMISSION_MATRIX[Role.GUEST]).toContain(Permission.COMMENT_EDIT_OWN);
      expect(PERMISSION_MATRIX[Role.GUEST]).toContain(Permission.COMMENT_DELETE_OWN);
    });

    it("should assign COMMENT_EDIT_OWN and COMMENT_DELETE_OWN to APPLICANT", () => {
      expect(PERMISSION_MATRIX[Role.APPLICANT]).toContain(Permission.COMMENT_EDIT_OWN);
      expect(PERMISSION_MATRIX[Role.APPLICANT]).toContain(Permission.COMMENT_DELETE_OWN);
    });

    it("should assign empty permissions to NONE", () => {
      expect(PERMISSION_MATRIX[Role.NONE]).toEqual([]);
    });
  });

  describe("getPermissionsForRoles", () => {
    it("should return empty array for empty roles", () => {
      expect(getPermissionsForRoles([])).toEqual([]);
    });

    it("should return all permissions for SUPER_ADMIN", () => {
      const permissions = getPermissionsForRoles([Role.SUPER_ADMIN]);
      const allPermissions = Object.values(Permission);
      allPermissions.forEach((perm) => {
        expect(permissions).toContain(perm);
      });
    });

    it("should expand community wildcard for COMMUNITY_ADMIN", () => {
      const permissions = getPermissionsForRoles([Role.COMMUNITY_ADMIN]);
      expect(permissions).toContain(Permission.COMMUNITY_VIEW);
      expect(permissions).toContain(Permission.COMMUNITY_EDIT);
      expect(permissions).toContain(Permission.COMMUNITY_MANAGE_MEMBERS);
    });

    it("should merge permissions from multiple roles", () => {
      const permissions = getPermissionsForRoles([Role.APPLICANT, Role.PROGRAM_REVIEWER]);
      expect(permissions).toContain(Permission.APPLICATION_CREATE);
      expect(permissions).toContain(Permission.APPLICATION_REVIEW);
    });

    it("should deduplicate permissions", () => {
      const permissions = getPermissionsForRoles([Role.GUEST, Role.APPLICANT]);
      // Both GUEST and APPLICANT share PROGRAM_VIEW, APPLICATION_READ, COMMENT_EDIT_OWN, COMMENT_DELETE_OWN
      const viewCount = permissions.filter((p) => p === Permission.PROGRAM_VIEW).length;
      expect(viewCount).toBe(1);
      const readCount = permissions.filter((p) => p === Permission.APPLICATION_READ).length;
      expect(readCount).toBe(1);
    });
  });

  describe("hasPermission", () => {
    it("should return true for exact match", () => {
      expect(hasPermission([Permission.COMMUNITY_VIEW], Permission.COMMUNITY_VIEW)).toBe(true);
    });

    it("should return false when permission not in list", () => {
      expect(hasPermission([Permission.COMMUNITY_VIEW], Permission.COMMUNITY_EDIT)).toBe(false);
    });

    it("should return false for empty permissions", () => {
      expect(hasPermission([], Permission.COMMUNITY_VIEW)).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("should return true when at least one permission matches", () => {
      expect(
        hasAnyPermission(
          [Permission.COMMUNITY_VIEW, Permission.PROGRAM_VIEW],
          [Permission.COMMUNITY_VIEW, Permission.APPLICATION_CREATE]
        )
      ).toBe(true);
    });

    it("should return false when no permissions match", () => {
      expect(hasAnyPermission([Permission.COMMUNITY_VIEW], [Permission.APPLICATION_CREATE])).toBe(
        false
      );
    });

    it("should return false for empty user permissions", () => {
      expect(hasAnyPermission([], [Permission.COMMUNITY_VIEW])).toBe(false);
    });

    it("should return false for empty required permissions", () => {
      expect(hasAnyPermission([Permission.COMMUNITY_VIEW], [])).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    it("should return true when all permissions match", () => {
      expect(
        hasAllPermissions(
          [Permission.COMMUNITY_VIEW, Permission.COMMUNITY_EDIT, Permission.PROGRAM_VIEW],
          [Permission.COMMUNITY_VIEW, Permission.COMMUNITY_EDIT]
        )
      ).toBe(true);
    });

    it("should return false when some permissions are missing", () => {
      expect(
        hasAllPermissions(
          [Permission.COMMUNITY_VIEW],
          [Permission.COMMUNITY_VIEW, Permission.COMMUNITY_EDIT]
        )
      ).toBe(false);
    });

    it("should return false for empty user permissions", () => {
      expect(hasAllPermissions([], [Permission.COMMUNITY_VIEW])).toBe(false);
    });

    it("should return true for empty required permissions", () => {
      expect(hasAllPermissions([Permission.COMMUNITY_VIEW], [])).toBe(true);
    });
  });
});
