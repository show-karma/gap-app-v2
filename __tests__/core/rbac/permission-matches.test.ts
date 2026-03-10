import {
  Permission,
  type PermissionString,
  permissionMatches,
} from "@/src/core/rbac/types/permission";

describe("permissionMatches", () => {
  describe("exact match", () => {
    it("returns true when pattern equals permission exactly", () => {
      expect(permissionMatches(Permission.COMMUNITY_VIEW, Permission.COMMUNITY_VIEW)).toBe(true);
    });

    it("returns false when pattern is a different permission", () => {
      expect(permissionMatches(Permission.COMMUNITY_EDIT, Permission.COMMUNITY_VIEW)).toBe(false);
    });

    it("returns false for no partial string match", () => {
      // "application:rea" is not a valid PermissionString at the type level, but at runtime
      // the function should treat unknown strings as exact match only and return false.
      const partial = "application:rea" as unknown as PermissionString;
      expect(permissionMatches(partial, Permission.APPLICATION_READ)).toBe(false);
    });

    it("returns false for prefix without wildcard suffix", () => {
      // "community" (no colon) does not match "community:view"
      const prefixOnly = "community" as unknown as PermissionString;
      expect(permissionMatches(prefixOnly, Permission.COMMUNITY_VIEW)).toBe(false);
    });
  });

  describe("global wildcard *", () => {
    it("matches any permission", () => {
      expect(permissionMatches("*", Permission.COMMUNITY_VIEW)).toBe(true);
      expect(permissionMatches("*", Permission.APPLICATION_CREATE)).toBe(true);
      expect(permissionMatches("*", Permission.MILESTONE_APPROVE)).toBe(true);
      expect(permissionMatches("*", Permission.REVIEW_CREATE)).toBe(true);
    });

    it("matches every defined Permission value", () => {
      for (const perm of Object.values(Permission)) {
        expect(permissionMatches("*", perm)).toBe(true);
      }
    });
  });

  describe("resource wildcard resource:*", () => {
    it("matches all permissions within the same resource", () => {
      expect(permissionMatches("community:*", Permission.COMMUNITY_VIEW)).toBe(true);
      expect(permissionMatches("community:*", Permission.COMMUNITY_EDIT)).toBe(true);
      expect(permissionMatches("community:*", Permission.COMMUNITY_MANAGE_MEMBERS)).toBe(true);
      expect(permissionMatches("community:*", Permission.COMMUNITY_MANAGE_PROGRAMS)).toBe(true);
    });

    it("does NOT match permissions from a different resource", () => {
      expect(permissionMatches("community:*", Permission.PROGRAM_VIEW)).toBe(false);
      expect(permissionMatches("community:*", Permission.APPLICATION_READ)).toBe(false);
      expect(permissionMatches("community:*", Permission.MILESTONE_SUBMIT)).toBe(false);
    });

    it("matches all program permissions with program:*", () => {
      expect(permissionMatches("program:*", Permission.PROGRAM_VIEW)).toBe(true);
      expect(permissionMatches("program:*", Permission.PROGRAM_EDIT)).toBe(true);
      expect(permissionMatches("program:*", Permission.PROGRAM_MANAGE_REVIEWERS)).toBe(true);
      expect(permissionMatches("program:*", Permission.PROGRAM_VIEW_ANALYTICS)).toBe(true);
      expect(permissionMatches("program:*", Permission.PROGRAM_MANAGE_ADMINS)).toBe(true);
    });

    it("does NOT match community permissions with program:*", () => {
      expect(permissionMatches("program:*", Permission.COMMUNITY_VIEW)).toBe(false);
      expect(permissionMatches("program:*", Permission.COMMUNITY_EDIT)).toBe(false);
    });

    it("matches registry permissions with registry:*", () => {
      expect(permissionMatches("registry:*", Permission.REGISTRY_VIEW)).toBe(true);
      expect(permissionMatches("registry:*", Permission.REGISTRY_EDIT)).toBe(true);
      expect(permissionMatches("registry:*", Permission.REGISTRY_APPROVE)).toBe(true);
      expect(permissionMatches("registry:*", Permission.REGISTRY_REJECT)).toBe(true);
    });

    it("does NOT match application permissions with registry:*", () => {
      expect(permissionMatches("registry:*", Permission.APPLICATION_READ)).toBe(false);
    });
  });

  describe("empty string edge case", () => {
    it("empty pattern does not match any permission", () => {
      const empty = "" as unknown as PermissionString;
      expect(permissionMatches(empty, Permission.COMMUNITY_VIEW)).toBe(false);
      expect(permissionMatches(empty, Permission.APPLICATION_READ)).toBe(false);
    });
  });
});
