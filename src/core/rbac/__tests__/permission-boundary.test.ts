import { getPermissionsForRoles, PERMISSION_MATRIX } from "../policies/permission-matrix";
import { isValidPermission, Permission } from "../types/permission";
import { Role } from "../types/role";

describe("Permission Boundary Tests", () => {
  describe("PERMISSION_MATRIX snapshot", () => {
    it("should match the expected SUPER_ADMIN permissions", () => {
      expect(PERMISSION_MATRIX[Role.SUPER_ADMIN]).toEqual(["*"]);
    });

    it("should match the expected REGISTRY_ADMIN permissions (specific, not wildcard)", () => {
      const registryPerms = PERMISSION_MATRIX[Role.REGISTRY_ADMIN];
      expect(registryPerms).toContain("registry:*");
      expect(registryPerms).toContain(Permission.PROGRAM_VIEW);
      expect(registryPerms).not.toContain("*");
      expect(registryPerms).toHaveLength(2);
    });

    it("should match the expected COMMUNITY_ADMIN permissions", () => {
      const perms = PERMISSION_MATRIX[Role.COMMUNITY_ADMIN];
      expect(perms).toContain("community:*");
      expect(perms).toContain("program:*");
      expect(perms).toContain("application:*");
      expect(perms).toContain("comment:*");
      expect(perms).toContain(Permission.MILESTONE_VIEW_ALL);
      expect(perms).toContain(Permission.MILESTONE_APPROVE);
      expect(perms).toContain(Permission.MILESTONE_REJECT);
      expect(perms).toContain(Permission.REVIEW_VIEW_ALL);
      expect(perms).toContain(Permission.REVIEW_CREATE);
      expect(perms).toHaveLength(9);
    });

    it("should match the expected PROGRAM_CREATOR permissions", () => {
      const perms = PERMISSION_MATRIX[Role.PROGRAM_CREATOR];
      expect(perms).toContain(Permission.PROGRAM_VIEW);
      expect(perms).toContain(Permission.PROGRAM_EDIT);
      expect(perms).toContain(Permission.PROGRAM_MANAGE_ADMINS);
      expect(perms).toContain(Permission.PROGRAM_MANAGE_REVIEWERS);
      expect(perms).toContain(Permission.PROGRAM_VIEW_ANALYTICS);
      expect(perms).toContain(Permission.APPLICATION_VIEW_ALL);
      expect(perms).toContain(Permission.APPLICATION_READ);
      expect(perms).toContain(Permission.APPLICATION_COMMENT);
      expect(perms).toContain(Permission.APPLICATION_APPROVE);
      expect(perms).toContain(Permission.APPLICATION_REJECT);
      expect(perms).toContain(Permission.APPLICATION_CHANGE_STATUS);
      expect(perms).toContain(Permission.MILESTONE_VIEW_ALL);
      expect(perms).toContain(Permission.MILESTONE_APPROVE);
      expect(perms).toContain(Permission.MILESTONE_REJECT);
      expect(perms).toContain(Permission.REVIEW_VIEW_ALL);
      expect(perms).toContain(Permission.REVIEW_CREATE);
      expect(perms).toContain(Permission.COMMENT_EDIT_OWN);
      expect(perms).toContain(Permission.COMMENT_DELETE_OWN);
      expect(perms).toHaveLength(18);
    });

    it("should match the expected PROGRAM_ADMIN permissions", () => {
      const perms = PERMISSION_MATRIX[Role.PROGRAM_ADMIN];
      expect(perms).toContain(Permission.PROGRAM_VIEW);
      expect(perms).toContain(Permission.PROGRAM_EDIT);
      expect(perms).toContain(Permission.PROGRAM_MANAGE_REVIEWERS);
      expect(perms).toContain(Permission.PROGRAM_VIEW_ANALYTICS);
      expect(perms).toContain(Permission.APPLICATION_VIEW_ALL);
      expect(perms).toContain(Permission.APPLICATION_READ);
      expect(perms).toContain(Permission.APPLICATION_COMMENT);
      expect(perms).toContain(Permission.APPLICATION_APPROVE);
      expect(perms).toContain(Permission.APPLICATION_REJECT);
      expect(perms).toContain(Permission.APPLICATION_CHANGE_STATUS);
      expect(perms).toContain(Permission.MILESTONE_VIEW_ALL);
      expect(perms).toContain(Permission.MILESTONE_APPROVE);
      expect(perms).toContain(Permission.MILESTONE_REJECT);
      expect(perms).toContain(Permission.REVIEW_VIEW_ALL);
      expect(perms).toContain(Permission.REVIEW_CREATE);
      expect(perms).toContain(Permission.COMMENT_EDIT_OWN);
      expect(perms).toContain(Permission.COMMENT_DELETE_OWN);
      expect(perms).toHaveLength(17);
    });

    it("should match the expected PROGRAM_REVIEWER permissions", () => {
      const perms = PERMISSION_MATRIX[Role.PROGRAM_REVIEWER];
      expect(perms).toContain(Permission.PROGRAM_VIEW);
      expect(perms).toContain(Permission.APPLICATION_VIEW_ASSIGNED);
      expect(perms).toContain(Permission.APPLICATION_READ);
      expect(perms).toContain(Permission.APPLICATION_COMMENT);
      expect(perms).toContain(Permission.APPLICATION_REVIEW);
      expect(perms).toContain(Permission.APPLICATION_CHANGE_STATUS);
      expect(perms).toContain(Permission.REVIEW_CREATE);
      expect(perms).toContain(Permission.REVIEW_EDIT_OWN);
      expect(perms).toContain(Permission.COMMENT_EDIT_OWN);
      expect(perms).toContain(Permission.COMMENT_DELETE_OWN);
      expect(perms).toHaveLength(10);
    });

    it("should match the expected MILESTONE_REVIEWER permissions", () => {
      const perms = PERMISSION_MATRIX[Role.MILESTONE_REVIEWER];
      expect(perms).toContain(Permission.PROGRAM_VIEW);
      expect(perms).toContain(Permission.MILESTONE_VIEW_ASSIGNED);
      expect(perms).toContain(Permission.MILESTONE_REVIEW);
      expect(perms).toContain(Permission.MILESTONE_APPROVE);
      expect(perms).toContain(Permission.MILESTONE_REJECT);
      expect(perms).toContain(Permission.APPLICATION_CHANGE_STATUS);
      expect(perms).toContain(Permission.REVIEW_CREATE);
      expect(perms).toContain(Permission.REVIEW_EDIT_OWN);
      expect(perms).toContain(Permission.COMMENT_EDIT_OWN);
      expect(perms).toContain(Permission.COMMENT_DELETE_OWN);
      expect(perms).toHaveLength(10);
    });

    it("should match the expected APPLICANT permissions", () => {
      const perms = PERMISSION_MATRIX[Role.APPLICANT];
      expect(perms).toContain(Permission.PROGRAM_VIEW);
      expect(perms).toContain(Permission.APPLICATION_VIEW_OWN);
      expect(perms).toContain(Permission.APPLICATION_CREATE);
      expect(perms).toContain(Permission.APPLICATION_EDIT_OWN);
      expect(perms).toContain(Permission.APPLICATION_READ);
      expect(perms).toContain(Permission.APPLICATION_COMMENT);
      expect(perms).toContain(Permission.MILESTONE_VIEW_OWN);
      expect(perms).toContain(Permission.MILESTONE_SUBMIT);
      expect(perms).toContain(Permission.COMMENT_EDIT_OWN);
      expect(perms).toContain(Permission.COMMENT_DELETE_OWN);
      expect(perms).toHaveLength(10);
    });

    it("should match the expected GUEST permissions", () => {
      const perms = PERMISSION_MATRIX[Role.GUEST];
      expect(perms).toContain(Permission.PROGRAM_VIEW);
      expect(perms).toContain(Permission.APPLICATION_READ);
      expect(perms).toContain(Permission.COMMENT_EDIT_OWN);
      expect(perms).toContain(Permission.COMMENT_DELETE_OWN);
      expect(perms).toHaveLength(4);
    });

    it("should match the expected NONE permissions (empty)", () => {
      expect(PERMISSION_MATRIX[Role.NONE]).toEqual([]);
    });

    it("should have an entry for every Role enum value", () => {
      for (const role of Object.values(Role)) {
        expect(PERMISSION_MATRIX[role]).toBeDefined();
      }
    });
  });

  describe("Wildcard expansion", () => {
    it("should expand 'community:*' to all community permissions", () => {
      const permissions = getPermissionsForRoles([Role.COMMUNITY_ADMIN]);
      const communityPermissions = Object.values(Permission).filter((p) =>
        p.startsWith("community:")
      );
      for (const perm of communityPermissions) {
        expect(permissions).toContain(perm);
      }
    });

    it("should expand 'program:*' to all program permissions for COMMUNITY_ADMIN", () => {
      const permissions = getPermissionsForRoles([Role.COMMUNITY_ADMIN]);
      const programPermissions = Object.values(Permission).filter((p) => p.startsWith("program:"));
      for (const perm of programPermissions) {
        expect(permissions).toContain(perm);
      }
    });

    it("should expand 'registry:*' to all registry permissions for REGISTRY_ADMIN", () => {
      const permissions = getPermissionsForRoles([Role.REGISTRY_ADMIN]);
      const registryPermissions = Object.values(Permission).filter((p) =>
        p.startsWith("registry:")
      );
      for (const perm of registryPermissions) {
        expect(permissions).toContain(perm);
      }
    });

    it("should expand '*' to all permissions for SUPER_ADMIN", () => {
      const permissions = getPermissionsForRoles([Role.SUPER_ADMIN]);
      const allPermissions = Object.values(Permission);
      expect(permissions).toHaveLength(allPermissions.length);
      for (const perm of allPermissions) {
        expect(permissions).toContain(perm);
      }
    });
  });

  describe("Multi-role permission union", () => {
    it("should union permissions from APPLICANT and PROGRAM_REVIEWER", () => {
      const permissions = getPermissionsForRoles([Role.APPLICANT, Role.PROGRAM_REVIEWER]);

      // APPLICANT-specific permissions
      expect(permissions).toContain(Permission.APPLICATION_CREATE);
      expect(permissions).toContain(Permission.APPLICATION_EDIT_OWN);
      expect(permissions).toContain(Permission.APPLICATION_VIEW_OWN);
      expect(permissions).toContain(Permission.MILESTONE_VIEW_OWN);
      expect(permissions).toContain(Permission.MILESTONE_SUBMIT);

      // PROGRAM_REVIEWER-specific permissions
      expect(permissions).toContain(Permission.APPLICATION_REVIEW);
      expect(permissions).toContain(Permission.APPLICATION_VIEW_ASSIGNED);

      // Shared permissions (both roles have these)
      expect(permissions).toContain(Permission.PROGRAM_VIEW);
      expect(permissions).toContain(Permission.APPLICATION_READ);
      expect(permissions).toContain(Permission.APPLICATION_COMMENT);
      expect(permissions).toContain(Permission.APPLICATION_CHANGE_STATUS);
      expect(permissions).toContain(Permission.REVIEW_CREATE);
      expect(permissions).toContain(Permission.REVIEW_EDIT_OWN);
      expect(permissions).toContain(Permission.COMMENT_EDIT_OWN);
      expect(permissions).toContain(Permission.COMMENT_DELETE_OWN);
    });

    it("should deduplicate permissions when roles overlap", () => {
      const permissions = getPermissionsForRoles([Role.GUEST, Role.APPLICANT]);
      // Both have PROGRAM_VIEW
      const viewCount = permissions.filter((p) => p === Permission.PROGRAM_VIEW).length;
      expect(viewCount).toBe(1);
    });

    it("should union permissions from MILESTONE_REVIEWER and PROGRAM_REVIEWER", () => {
      const permissions = getPermissionsForRoles([Role.MILESTONE_REVIEWER, Role.PROGRAM_REVIEWER]);

      // MILESTONE_REVIEWER specific
      expect(permissions).toContain(Permission.MILESTONE_VIEW_ASSIGNED);
      expect(permissions).toContain(Permission.MILESTONE_REVIEW);
      expect(permissions).toContain(Permission.MILESTONE_APPROVE);
      expect(permissions).toContain(Permission.MILESTONE_REJECT);

      // PROGRAM_REVIEWER specific
      expect(permissions).toContain(Permission.APPLICATION_VIEW_ASSIGNED);
      expect(permissions).toContain(Permission.APPLICATION_REVIEW);

      // Shared permissions
      expect(permissions).toContain(Permission.APPLICATION_CHANGE_STATUS);
      expect(permissions).toContain(Permission.APPLICATION_READ);
      expect(permissions).toContain(Permission.APPLICATION_COMMENT);
      expect(permissions).toContain(Permission.REVIEW_CREATE);
      expect(permissions).toContain(Permission.REVIEW_EDIT_OWN);
      expect(permissions).toContain(Permission.COMMENT_EDIT_OWN);
      expect(permissions).toContain(Permission.COMMENT_DELETE_OWN);
    });

    it("should return all permissions when one role includes SUPER_ADMIN", () => {
      const permissions = getPermissionsForRoles([Role.APPLICANT, Role.SUPER_ADMIN]);
      const allPermissions = Object.values(Permission);
      expect(permissions).toHaveLength(allPermissions.length);
    });
  });

  describe("Security boundary checks", () => {
    it("PROGRAM_REVIEWER should NOT have admin permissions", () => {
      const permissions = getPermissionsForRoles([Role.PROGRAM_REVIEWER]);
      expect(permissions).not.toContain(Permission.COMMUNITY_EDIT);
      expect(permissions).not.toContain(Permission.COMMUNITY_MANAGE_MEMBERS);
      expect(permissions).not.toContain(Permission.PROGRAM_EDIT);
      expect(permissions).not.toContain(Permission.PROGRAM_MANAGE_REVIEWERS);
      expect(permissions).not.toContain(Permission.APPLICATION_APPROVE);
      expect(permissions).not.toContain(Permission.APPLICATION_REJECT);
    });

    it("MILESTONE_REVIEWER should NOT have program review permissions", () => {
      const permissions = getPermissionsForRoles([Role.MILESTONE_REVIEWER]);
      expect(permissions).not.toContain(Permission.APPLICATION_REVIEW);
      expect(permissions).not.toContain(Permission.APPLICATION_VIEW_ASSIGNED);
      expect(permissions).not.toContain(Permission.APPLICATION_APPROVE);
      expect(permissions).not.toContain(Permission.APPLICATION_REJECT);
    });

    it("APPLICANT should NOT have review or admin permissions", () => {
      const permissions = getPermissionsForRoles([Role.APPLICANT]);
      expect(permissions).not.toContain(Permission.APPLICATION_REVIEW);
      expect(permissions).not.toContain(Permission.APPLICATION_APPROVE);
      expect(permissions).not.toContain(Permission.APPLICATION_REJECT);
      expect(permissions).not.toContain(Permission.COMMUNITY_EDIT);
      expect(permissions).not.toContain(Permission.PROGRAM_EDIT);
      expect(permissions).not.toContain(Permission.REVIEW_CREATE);
    });

    it("GUEST should have limited read permissions", () => {
      const permissions = getPermissionsForRoles([Role.GUEST]);
      expect(permissions).toContain(Permission.PROGRAM_VIEW);
      expect(permissions).toContain(Permission.APPLICATION_READ);
      expect(permissions).toContain(Permission.COMMENT_EDIT_OWN);
      expect(permissions).toContain(Permission.COMMENT_DELETE_OWN);
      expect(permissions).toHaveLength(4);
      // Should NOT have write/admin permissions
      expect(permissions).not.toContain(Permission.APPLICATION_CREATE);
      expect(permissions).not.toContain(Permission.COMMUNITY_EDIT);
      expect(permissions).not.toContain(Permission.PROGRAM_EDIT);
    });

    it("NONE should have no permissions", () => {
      const permissions = getPermissionsForRoles([Role.NONE]);
      expect(permissions).toEqual([]);
    });

    it("REGISTRY_ADMIN should have specific registry permissions, not all permissions", () => {
      const permissions = getPermissionsForRoles([Role.REGISTRY_ADMIN]);
      // Should have registry permissions
      expect(permissions).toContain(Permission.REGISTRY_VIEW);
      expect(permissions).toContain(Permission.REGISTRY_EDIT);
      expect(permissions).toContain(Permission.REGISTRY_APPROVE);
      expect(permissions).toContain(Permission.REGISTRY_REJECT);
      expect(permissions).toContain(Permission.PROGRAM_VIEW);

      // Should NOT have all permissions (old wildcard behavior)
      expect(permissions).not.toContain(Permission.COMMUNITY_EDIT);
      expect(permissions).not.toContain(Permission.COMMUNITY_MANAGE_MEMBERS);
      expect(permissions).not.toContain(Permission.APPLICATION_APPROVE);
      expect(permissions).not.toContain(Permission.MILESTONE_APPROVE);
    });

    it("REGISTRY_ADMIN should NOT have community management permissions", () => {
      const permissions = getPermissionsForRoles([Role.REGISTRY_ADMIN]);
      expect(permissions).not.toContain(Permission.COMMUNITY_MANAGE_PROGRAMS);
      expect(permissions).not.toContain(Permission.COMMUNITY_MANAGE_MEMBERS);
    });
  });

  describe("isValidPermission", () => {
    it("should return true for valid permissions", () => {
      expect(isValidPermission("community:view")).toBe(true);
      expect(isValidPermission("program:edit")).toBe(true);
      expect(isValidPermission("application:approve")).toBe(true);
      expect(isValidPermission("registry:view")).toBe(true);
      expect(isValidPermission("comment:edit_own")).toBe(true);
      expect(isValidPermission("comment:delete_own")).toBe(true);
      expect(isValidPermission("program:manage_admins")).toBe(true);
    });

    it("should return false for invalid permissions", () => {
      expect(isValidPermission("unknown:permission")).toBe(false);
      expect(isValidPermission("")).toBe(false);
      expect(isValidPermission("*")).toBe(false);
      expect(isValidPermission("community:*")).toBe(false);
      expect(isValidPermission("COMMUNITY_VIEW")).toBe(false);
    });
  });

  describe("Permission enum completeness", () => {
    it("should have exactly 37 permissions", () => {
      expect(Object.values(Permission)).toHaveLength(37);
    });

    it("should include all registry permissions", () => {
      expect(Permission.REGISTRY_VIEW).toBe("registry:view");
      expect(Permission.REGISTRY_EDIT).toBe("registry:edit");
      expect(Permission.REGISTRY_APPROVE).toBe("registry:approve");
      expect(Permission.REGISTRY_REJECT).toBe("registry:reject");
    });

    it("should include PROGRAM_MANAGE_ADMINS", () => {
      expect(Permission.PROGRAM_MANAGE_ADMINS).toBe("program:manage_admins");
    });

    it("should include comment permissions", () => {
      expect(Permission.COMMENT_EDIT_OWN).toBe("comment:edit_own");
      expect(Permission.COMMENT_DELETE_OWN).toBe("comment:delete_own");
    });
  });
});
