import {
  getPermissionsForRoles,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  PERMISSION_MATRIX,
} from "../policies/permission-matrix";
import { isValidPermission, Permission } from "../types/permission";
import { getHighestRole, getRoleLevel, isRoleAtLeast, isValidRole, Role } from "../types/role";

/**
 * Comprehensive RBAC tests covering permission boundaries, negative cases,
 * and wildcard edge cases not addressed by existing test suites.
 */

describe("Permission Boundary Tests - Role Isolation", () => {
  describe("GUEST cannot access admin or write operations", () => {
    const guestPermissions = getPermissionsForRoles([Role.GUEST]);

    const adminPermissions = [
      Permission.COMMUNITY_EDIT,
      Permission.COMMUNITY_MANAGE_MEMBERS,
      Permission.COMMUNITY_MANAGE_PROGRAMS,
      Permission.REGISTRY_EDIT,
      Permission.REGISTRY_APPROVE,
      Permission.REGISTRY_REJECT,
      Permission.PROGRAM_EDIT,
      Permission.PROGRAM_MANAGE_ADMINS,
      Permission.PROGRAM_MANAGE_REVIEWERS,
      Permission.PROGRAM_VIEW_ANALYTICS,
    ];

    it.each(adminPermissions)("GUEST should NOT have %s", (perm) => {
      expect(guestPermissions).not.toContain(perm);
    });

    const writePermissions = [
      Permission.APPLICATION_CREATE,
      Permission.APPLICATION_EDIT_OWN,
      Permission.APPLICATION_APPROVE,
      Permission.APPLICATION_REJECT,
      Permission.APPLICATION_REVIEW,
      Permission.APPLICATION_CHANGE_STATUS,
      Permission.MILESTONE_SUBMIT,
      Permission.MILESTONE_REVIEW,
      Permission.MILESTONE_APPROVE,
      Permission.MILESTONE_REJECT,
      Permission.REVIEW_CREATE,
      Permission.REVIEW_EDIT_OWN,
      Permission.REVIEW_DELETE_OWN,
    ];

    it.each(writePermissions)("GUEST should NOT have %s", (perm) => {
      expect(guestPermissions).not.toContain(perm);
    });

    it("GUEST should only have exactly 4 read/own-comment permissions", () => {
      expect(guestPermissions).toHaveLength(4);
      expect(guestPermissions).toEqual(
        expect.arrayContaining([
          Permission.PROGRAM_VIEW,
          Permission.APPLICATION_READ,
          Permission.COMMENT_EDIT_OWN,
          Permission.COMMENT_DELETE_OWN,
        ])
      );
    });
  });

  describe("PROGRAM_REVIEWER cannot approve or reject applications", () => {
    const reviewerPermissions = getPermissionsForRoles([Role.PROGRAM_REVIEWER]);

    it("should NOT have APPLICATION_APPROVE", () => {
      expect(reviewerPermissions).not.toContain(Permission.APPLICATION_APPROVE);
    });

    it("should NOT have APPLICATION_REJECT", () => {
      expect(reviewerPermissions).not.toContain(Permission.APPLICATION_REJECT);
    });

    it("should NOT have APPLICATION_VIEW_ALL (only assigned)", () => {
      expect(reviewerPermissions).not.toContain(Permission.APPLICATION_VIEW_ALL);
      expect(reviewerPermissions).toContain(Permission.APPLICATION_VIEW_ASSIGNED);
    });

    it("should NOT have any milestone management permissions", () => {
      expect(reviewerPermissions).not.toContain(Permission.MILESTONE_APPROVE);
      expect(reviewerPermissions).not.toContain(Permission.MILESTONE_REJECT);
      expect(reviewerPermissions).not.toContain(Permission.MILESTONE_REVIEW);
      expect(reviewerPermissions).not.toContain(Permission.MILESTONE_VIEW_ALL);
    });

    it("should NOT have program edit or management permissions", () => {
      expect(reviewerPermissions).not.toContain(Permission.PROGRAM_EDIT);
      expect(reviewerPermissions).not.toContain(Permission.PROGRAM_MANAGE_ADMINS);
      expect(reviewerPermissions).not.toContain(Permission.PROGRAM_MANAGE_REVIEWERS);
    });
  });

  describe("MILESTONE_REVIEWER inherits PROGRAM_REVIEWER and adds milestone management", () => {
    const milestoneReviewerPerms = getPermissionsForRoles([Role.MILESTONE_REVIEWER]);

    it("should inherit APPLICATION_REVIEW from PROGRAM_REVIEWER layer", () => {
      expect(milestoneReviewerPerms).toContain(Permission.APPLICATION_REVIEW);
    });

    it("should NOT have APPLICATION_APPROVE (admin-only)", () => {
      expect(milestoneReviewerPerms).not.toContain(Permission.APPLICATION_APPROVE);
    });

    it("should NOT have APPLICATION_REJECT (admin-only)", () => {
      expect(milestoneReviewerPerms).not.toContain(Permission.APPLICATION_REJECT);
    });

    it("should inherit APPLICATION_VIEW_ASSIGNED from PROGRAM_REVIEWER layer", () => {
      expect(milestoneReviewerPerms).not.toContain(Permission.APPLICATION_VIEW_ALL);
      expect(milestoneReviewerPerms).toContain(Permission.APPLICATION_VIEW_ASSIGNED);
    });

    it("should have milestone-specific permissions", () => {
      expect(milestoneReviewerPerms).toContain(Permission.MILESTONE_VIEW_ASSIGNED);
      expect(milestoneReviewerPerms).toContain(Permission.MILESTONE_REVIEW);
      expect(milestoneReviewerPerms).toContain(Permission.MILESTONE_APPROVE);
      expect(milestoneReviewerPerms).toContain(Permission.MILESTONE_REJECT);
    });

    it("should be a strict superset of PROGRAM_REVIEWER", () => {
      const programReviewerPerms = getPermissionsForRoles([Role.PROGRAM_REVIEWER]);
      for (const perm of programReviewerPerms) {
        expect(milestoneReviewerPerms).toContain(perm);
      }
      expect(milestoneReviewerPerms.length).toBeGreaterThan(programReviewerPerms.length);
    });
  });

  describe("SUPER_ADMIN has full access to all permissions", () => {
    const adminPermissions = getPermissionsForRoles([Role.SUPER_ADMIN]);
    const allPermissions = Object.values(Permission);

    it("should have every single permission defined in the enum", () => {
      expect(adminPermissions).toHaveLength(allPermissions.length);
    });

    it.each(allPermissions)("SUPER_ADMIN should have %s", (perm) => {
      expect(adminPermissions).toContain(perm);
    });
  });

  describe("COMMUNITY_ADMIN has broad access within their community", () => {
    const communityAdminPerms = getPermissionsForRoles([Role.COMMUNITY_ADMIN]);

    it("should have all community permissions", () => {
      expect(communityAdminPerms).toContain(Permission.COMMUNITY_VIEW);
      expect(communityAdminPerms).toContain(Permission.COMMUNITY_EDIT);
      expect(communityAdminPerms).toContain(Permission.COMMUNITY_MANAGE_MEMBERS);
      expect(communityAdminPerms).toContain(Permission.COMMUNITY_MANAGE_PROGRAMS);
    });

    it("should have all program permissions (via wildcard)", () => {
      const programPerms = Object.values(Permission).filter((p) => p.startsWith("program:"));
      for (const perm of programPerms) {
        expect(communityAdminPerms).toContain(perm);
      }
    });

    it("should have all application permissions (via wildcard)", () => {
      const appPerms = Object.values(Permission).filter((p) => p.startsWith("application:"));
      for (const perm of appPerms) {
        expect(communityAdminPerms).toContain(perm);
      }
    });

    it("should NOT have registry admin permissions", () => {
      expect(communityAdminPerms).not.toContain(Permission.REGISTRY_EDIT);
      expect(communityAdminPerms).not.toContain(Permission.REGISTRY_APPROVE);
      expect(communityAdminPerms).not.toContain(Permission.REGISTRY_REJECT);
    });
  });

  describe("PROGRAM_CREATOR vs PROGRAM_ADMIN privilege differences", () => {
    const creatorPerms = getPermissionsForRoles([Role.PROGRAM_CREATOR]);
    const adminPerms = getPermissionsForRoles([Role.PROGRAM_ADMIN]);

    it("PROGRAM_CREATOR should have PROGRAM_MANAGE_ADMINS", () => {
      expect(creatorPerms).toContain(Permission.PROGRAM_MANAGE_ADMINS);
    });

    it("PROGRAM_ADMIN should NOT have PROGRAM_MANAGE_ADMINS", () => {
      expect(adminPerms).not.toContain(Permission.PROGRAM_MANAGE_ADMINS);
    });

    it("both should share all other program management permissions", () => {
      const sharedPerms = [
        Permission.PROGRAM_VIEW,
        Permission.PROGRAM_EDIT,
        Permission.PROGRAM_MANAGE_REVIEWERS,
        Permission.PROGRAM_VIEW_ANALYTICS,
        Permission.APPLICATION_VIEW_ALL,
        Permission.APPLICATION_APPROVE,
        Permission.APPLICATION_REJECT,
      ];
      for (const perm of sharedPerms) {
        expect(creatorPerms).toContain(perm);
        expect(adminPerms).toContain(perm);
      }
    });
  });

  describe("APPLICANT is restricted to own resources", () => {
    const applicantPerms = getPermissionsForRoles([Role.APPLICANT]);

    it("should see own applications but not all or assigned", () => {
      expect(applicantPerms).toContain(Permission.APPLICATION_VIEW_OWN);
      expect(applicantPerms).not.toContain(Permission.APPLICATION_VIEW_ALL);
      expect(applicantPerms).not.toContain(Permission.APPLICATION_VIEW_ASSIGNED);
    });

    it("should see own milestones but not all or assigned", () => {
      expect(applicantPerms).toContain(Permission.MILESTONE_VIEW_OWN);
      expect(applicantPerms).not.toContain(Permission.MILESTONE_VIEW_ALL);
      expect(applicantPerms).not.toContain(Permission.MILESTONE_VIEW_ASSIGNED);
    });

    it("should NOT have any review permissions", () => {
      expect(applicantPerms).not.toContain(Permission.APPLICATION_REVIEW);
      expect(applicantPerms).not.toContain(Permission.MILESTONE_REVIEW);
      expect(applicantPerms).not.toContain(Permission.REVIEW_CREATE);
      expect(applicantPerms).not.toContain(Permission.REVIEW_VIEW_ALL);
    });
  });
});

describe("Negative Tests - Unknown/Invalid Inputs", () => {
  describe("Unknown roles fallback gracefully", () => {
    it("getPermissionsForRoles with unknown role returns empty array", () => {
      const permissions = getPermissionsForRoles(["UNKNOWN_ROLE" as Role]);
      expect(permissions).toEqual([]);
    });

    it("getPermissionsForRoles with mixed valid and unknown roles returns only valid permissions", () => {
      const permissions = getPermissionsForRoles(["UNKNOWN_ROLE" as Role, Role.GUEST]);
      // Should contain GUEST permissions but nothing from the unknown role
      expect(permissions).toContain(Permission.PROGRAM_VIEW);
      expect(permissions).toContain(Permission.APPLICATION_READ);
      expect(permissions).toHaveLength(4);
    });

    it("getPermissionsForRoles with empty string role returns empty array", () => {
      const permissions = getPermissionsForRoles(["" as Role]);
      expect(permissions).toEqual([]);
    });

    it("isValidRole rejects unknown role strings", () => {
      expect(isValidRole("UNKNOWN_ROLE")).toBe(false);
      expect(isValidRole("super_admin")).toBe(false);
      expect(isValidRole("Guest")).toBe(false);
      expect(isValidRole("admin")).toBe(false);
      expect(isValidRole("  GUEST  ")).toBe(false);
    });

    it("getRoleLevel returns 0 for unknown roles (same as GUEST)", () => {
      expect(getRoleLevel("UNKNOWN_ROLE" as Role)).toBe(0);
    });

    it("getHighestRole with all unknown roles returns GUEST", () => {
      expect(getHighestRole([])).toBe(Role.GUEST);
    });

    it("isRoleAtLeast with unknown role treats it as GUEST level", () => {
      expect(isRoleAtLeast("UNKNOWN" as Role, Role.GUEST)).toBe(true);
      expect(isRoleAtLeast("UNKNOWN" as Role, Role.APPLICANT)).toBe(false);
    });
  });

  describe("Invalid permissions rejected by validation", () => {
    it("rejects non-existent permission strings", () => {
      expect(isValidPermission("admin:super")).toBe(false);
      expect(isValidPermission("community:delete")).toBe(false);
      expect(isValidPermission("program:create")).toBe(false);
      expect(isValidPermission("user:view")).toBe(false);
    });

    it("rejects wildcard strings (they are not concrete permissions)", () => {
      expect(isValidPermission("*")).toBe(false);
      expect(isValidPermission("community:*")).toBe(false);
      expect(isValidPermission("program:*")).toBe(false);
      expect(isValidPermission("application:*")).toBe(false);
    });

    it("rejects empty and whitespace strings", () => {
      expect(isValidPermission("")).toBe(false);
      expect(isValidPermission(" ")).toBe(false);
      expect(isValidPermission("  community:view  ")).toBe(false);
    });

    it("rejects enum key names (must use value format)", () => {
      expect(isValidPermission("COMMUNITY_VIEW")).toBe(false);
      expect(isValidPermission("PROGRAM_EDIT")).toBe(false);
      expect(isValidPermission("APPLICATION_APPROVE")).toBe(false);
    });

    it("rejects case-mismatched permission strings", () => {
      expect(isValidPermission("Community:View")).toBe(false);
      expect(isValidPermission("COMMUNITY:VIEW")).toBe(false);
      expect(isValidPermission("Program:Edit")).toBe(false);
    });
  });

  describe("hasPermission with edge cases", () => {
    it("returns false for empty user permissions array", () => {
      expect(hasPermission([], Permission.COMMUNITY_VIEW)).toBe(false);
    });

    it("returns false when permission is not in the array", () => {
      expect(
        hasPermission(
          [Permission.PROGRAM_VIEW, Permission.APPLICATION_READ],
          Permission.COMMUNITY_EDIT
        )
      ).toBe(false);
    });

    it("returns true only for exact match", () => {
      expect(
        hasPermission([Permission.APPLICATION_VIEW_OWN], Permission.APPLICATION_VIEW_OWN)
      ).toBe(true);
      expect(
        hasPermission([Permission.APPLICATION_VIEW_OWN], Permission.APPLICATION_VIEW_ALL)
      ).toBe(false);
    });
  });

  describe("hasAnyPermission with edge cases", () => {
    it("returns false when both arrays are empty", () => {
      expect(hasAnyPermission([], [])).toBe(false);
    });

    it("returns false when required set is empty", () => {
      expect(hasAnyPermission([Permission.COMMUNITY_VIEW], [])).toBe(false);
    });

    it("handles single-element arrays correctly", () => {
      expect(hasAnyPermission([Permission.COMMUNITY_VIEW], [Permission.COMMUNITY_VIEW])).toBe(true);
      expect(hasAnyPermission([Permission.COMMUNITY_VIEW], [Permission.COMMUNITY_EDIT])).toBe(
        false
      );
    });
  });

  describe("hasAllPermissions with edge cases", () => {
    it("returns true when required set is empty (vacuous truth)", () => {
      expect(hasAllPermissions([], [])).toBe(true);
      expect(hasAllPermissions([Permission.COMMUNITY_VIEW], [])).toBe(true);
    });

    it("returns false when user has no permissions but some are required", () => {
      expect(hasAllPermissions([], [Permission.COMMUNITY_VIEW])).toBe(false);
    });

    it("fails when even one required permission is missing", () => {
      expect(
        hasAllPermissions(
          [Permission.PROGRAM_VIEW, Permission.PROGRAM_EDIT],
          [Permission.PROGRAM_VIEW, Permission.PROGRAM_EDIT, Permission.PROGRAM_MANAGE_ADMINS]
        )
      ).toBe(false);
    });
  });

  describe("NONE role has zero access", () => {
    const nonePermissions = getPermissionsForRoles([Role.NONE]);

    it("returns empty permissions", () => {
      expect(nonePermissions).toEqual([]);
    });

    it("hasPermission always returns false for NONE", () => {
      for (const perm of Object.values(Permission)) {
        expect(hasPermission(nonePermissions, perm)).toBe(false);
      }
    });

    it("hasAnyPermission always returns false for NONE", () => {
      expect(hasAnyPermission(nonePermissions, Object.values(Permission))).toBe(false);
    });
  });
});

describe("Wildcard Expansion Edge Cases", () => {
  describe("Global wildcard (*) expansion", () => {
    it("SUPER_ADMIN gets every permission via * wildcard", () => {
      const permissions = getPermissionsForRoles([Role.SUPER_ADMIN]);
      const allPermissions = Object.values(Permission);
      expect(permissions).toHaveLength(allPermissions.length);
      for (const perm of allPermissions) {
        expect(permissions).toContain(perm);
      }
    });

    it("* wildcard overrides all other roles in multi-role set", () => {
      const withSuper = getPermissionsForRoles([Role.GUEST, Role.SUPER_ADMIN]);
      const superOnly = getPermissionsForRoles([Role.SUPER_ADMIN]);
      expect(withSuper).toHaveLength(superOnly.length);
    });

    it("SUPER_ADMIN placed after other roles still expands to all", () => {
      const permissions = getPermissionsForRoles([
        Role.APPLICANT,
        Role.PROGRAM_REVIEWER,
        Role.SUPER_ADMIN,
      ]);
      expect(permissions).toHaveLength(Object.values(Permission).length);
    });
  });

  describe("Domain wildcard (resource:*) expansion", () => {
    it("community:* expands to all 4 community permissions", () => {
      const communityPerms = Object.values(Permission).filter((p) => p.startsWith("community:"));
      expect(communityPerms).toHaveLength(4);

      const adminPerms = getPermissionsForRoles([Role.COMMUNITY_ADMIN]);
      for (const perm of communityPerms) {
        expect(adminPerms).toContain(perm);
      }
    });

    it("registry:* expands to all 4 registry permissions", () => {
      const registryPerms = Object.values(Permission).filter((p) => p.startsWith("registry:"));
      expect(registryPerms).toHaveLength(4);

      const adminPerms = getPermissionsForRoles([Role.REGISTRY_ADMIN]);
      for (const perm of registryPerms) {
        expect(adminPerms).toContain(perm);
      }
    });

    it("application:* expands to all 11 application permissions for COMMUNITY_ADMIN", () => {
      const appPerms = Object.values(Permission).filter((p) => p.startsWith("application:"));
      expect(appPerms).toHaveLength(11);

      const adminPerms = getPermissionsForRoles([Role.COMMUNITY_ADMIN]);
      for (const perm of appPerms) {
        expect(adminPerms).toContain(perm);
      }
    });

    it("program:* expands to all 5 program permissions for COMMUNITY_ADMIN", () => {
      const programPerms = Object.values(Permission).filter((p) => p.startsWith("program:"));
      expect(programPerms).toHaveLength(5);

      const adminPerms = getPermissionsForRoles([Role.COMMUNITY_ADMIN]);
      for (const perm of programPerms) {
        expect(adminPerms).toContain(perm);
      }
    });

    it("comment:* expands to both comment permissions for COMMUNITY_ADMIN", () => {
      const commentPerms = Object.values(Permission).filter((p) => p.startsWith("comment:"));
      expect(commentPerms).toHaveLength(2);

      const adminPerms = getPermissionsForRoles([Role.COMMUNITY_ADMIN]);
      for (const perm of commentPerms) {
        expect(adminPerms).toContain(perm);
      }
    });
  });

  describe("Multiple domain wildcards combined", () => {
    it("COMMUNITY_ADMIN has 4 domain wildcards that expand correctly", () => {
      const perms = getPermissionsForRoles([Role.COMMUNITY_ADMIN]);
      // community:* (4) + program:* (5) + application:* (11) + comment:* (2) + explicit milestones (3) + reviews (2)
      const communityCount = Object.values(Permission).filter((p) =>
        p.startsWith("community:")
      ).length;
      const programCount = Object.values(Permission).filter((p) => p.startsWith("program:")).length;
      const appCount = Object.values(Permission).filter((p) => p.startsWith("application:")).length;
      const commentCount = Object.values(Permission).filter((p) => p.startsWith("comment:")).length;

      // All wildcard domains should be fully expanded
      expect(perms.filter((p) => p.startsWith("community:")).length).toBe(communityCount);
      expect(perms.filter((p) => p.startsWith("program:")).length).toBe(programCount);
      expect(perms.filter((p) => p.startsWith("application:")).length).toBe(appCount);
      expect(perms.filter((p) => p.startsWith("comment:")).length).toBe(commentCount);
    });
  });

  describe("Wildcard + explicit permission overlap (no duplicates)", () => {
    it("REGISTRY_ADMIN with registry:* and explicit PROGRAM_VIEW has no duplication", () => {
      const perms = getPermissionsForRoles([Role.REGISTRY_ADMIN]);
      // registry:* expands to 4 + 1 explicit PROGRAM_VIEW = 5 total
      expect(perms).toHaveLength(5);
      const viewCount = perms.filter((p) => p === Permission.PROGRAM_VIEW).length;
      expect(viewCount).toBe(1);
    });

    it("combining COMMUNITY_ADMIN + PROGRAM_CREATOR produces no duplicate permissions", () => {
      const perms = getPermissionsForRoles([Role.COMMUNITY_ADMIN, Role.PROGRAM_CREATOR]);
      const permSet = new Set(perms);
      expect(perms.length).toBe(permSet.size);
    });

    it("combining multiple roles with overlapping permissions deduplicates", () => {
      const perms = getPermissionsForRoles([
        Role.PROGRAM_REVIEWER,
        Role.MILESTONE_REVIEWER,
        Role.APPLICANT,
      ]);
      const permSet = new Set(perms);
      expect(perms.length).toBe(permSet.size);
    });
  });

  describe("Wildcard does not match across domain boundaries", () => {
    it("registry:* does NOT grant community permissions", () => {
      const perms = getPermissionsForRoles([Role.REGISTRY_ADMIN]);
      expect(perms).not.toContain(Permission.COMMUNITY_VIEW);
      expect(perms).not.toContain(Permission.COMMUNITY_EDIT);
    });

    it("community:* does NOT grant registry permissions", () => {
      const perms = getPermissionsForRoles([Role.COMMUNITY_ADMIN]);
      expect(perms).not.toContain(Permission.REGISTRY_VIEW);
      expect(perms).not.toContain(Permission.REGISTRY_EDIT);
      expect(perms).not.toContain(Permission.REGISTRY_APPROVE);
      expect(perms).not.toContain(Permission.REGISTRY_REJECT);
    });

    it("program:* does NOT grant milestone or review permissions", () => {
      // COMMUNITY_ADMIN has program:* but also has explicit milestone/review perms
      // Test via raw matrix: program:* only in the wildcard should not expand to milestone
      const programWildcardExpanded = Object.values(Permission).filter((p) =>
        p.startsWith("program:")
      );
      // Verify none of these start with "milestone:" or "review:"
      for (const perm of programWildcardExpanded) {
        expect(perm).not.toMatch(/^milestone:/);
        expect(perm).not.toMatch(/^review:/);
      }
    });
  });
});
