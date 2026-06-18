import { isValidPermission, Permission, permissionMatches } from "@/src/core/rbac/types/permission";

describe("isValidPermission", () => {
  describe("valid permissions (happy path)", () => {
    it("returns true for every defined Permission enum value", () => {
      for (const value of Object.values(Permission)) {
        expect(isValidPermission(value)).toBe(true);
      }
    });

    it("returns true for newly added PROJECT_* permissions", () => {
      expect(isValidPermission(Permission.PROJECT_VIEW)).toBe(true);
      expect(isValidPermission(Permission.PROJECT_EDIT)).toBe(true);
      expect(isValidPermission(Permission.PROJECT_MANAGE_LINKS)).toBe(true);
      expect(isValidPermission(Permission.PROJECT_MANAGE_MEMBERS)).toBe(true);
    });

    it("returns true for MILESTONE_EDIT", () => {
      expect(isValidPermission(Permission.MILESTONE_EDIT)).toBe(true);
    });

    it("returns true when given the raw string value of a permission", () => {
      // Server payloads arrive as plain strings, not enum references.
      expect(isValidPermission("project:edit")).toBe(true);
      expect(isValidPermission("milestone:edit")).toBe(true);
      expect(isValidPermission("community:manage_members")).toBe(true);
    });
  });

  describe("invalid permissions (security-relevant rejections)", () => {
    it("returns false for an unknown resource:action string", () => {
      expect(isValidPermission("project:destroy")).toBe(false);
      expect(isValidPermission("superadmin:everything")).toBe(false);
    });

    it("returns false for garbage / arbitrary strings", () => {
      expect(isValidPermission("not-a-permission")).toBe(false);
      expect(isValidPermission("12345")).toBe(false);
      expect(isValidPermission("{}")).toBe(false);
    });

    it("returns false for wildcard patterns (these are not concrete permissions)", () => {
      // Wildcards belong to permissionMatches patterns, never to the permission set.
      expect(isValidPermission("*")).toBe(false);
      expect(isValidPermission("project:*")).toBe(false);
    });

    it("returns false for the resource prefix without an action", () => {
      expect(isValidPermission("project")).toBe(false);
      expect(isValidPermission("milestone")).toBe(false);
    });
  });

  describe("boundary and edge cases", () => {
    it("returns false for the empty string", () => {
      expect(isValidPermission("")).toBe(false);
    });

    it("is case-sensitive and rejects differently-cased values", () => {
      expect(isValidPermission("PROJECT:EDIT")).toBe(false);
      expect(isValidPermission("Project:Edit")).toBe(false);
    });

    it("rejects values with surrounding whitespace", () => {
      expect(isValidPermission(" project:edit")).toBe(false);
      expect(isValidPermission("project:edit ")).toBe(false);
    });

    it("returns false for null and undefined coerced as strings", () => {
      // Untrusted server values may be missing; the guard must not throw and must reject.
      expect(isValidPermission(null as unknown as string)).toBe(false);
      expect(isValidPermission(undefined as unknown as string)).toBe(false);
    });

    it("narrows the type to Permission when it returns true", () => {
      const candidate: string = "project:edit";
      if (isValidPermission(candidate)) {
        const narrowed: Permission = candidate;
        expect(narrowed).toBe(Permission.PROJECT_EDIT);
      } else {
        throw new Error("expected candidate to be a valid permission");
      }
    });
  });
});

describe("permissionMatches", () => {
  describe("global wildcard", () => {
    it("grants any permission when the pattern is '*'", () => {
      expect(permissionMatches("*", Permission.PROJECT_EDIT)).toBe(true);
      expect(permissionMatches("*", Permission.COMMUNITY_VIEW)).toBe(true);
      expect(permissionMatches("*", Permission.MILESTONE_EDIT)).toBe(true);
    });
  });

  describe("resource wildcard ('resource:*')", () => {
    it("grants every action within the matching resource", () => {
      expect(permissionMatches("community:*", Permission.COMMUNITY_VIEW)).toBe(true);
      expect(permissionMatches("project:*", Permission.PROJECT_EDIT)).toBe(true);
      expect(permissionMatches("project:*", Permission.PROJECT_VIEW)).toBe(true);
    });

    it("does NOT grant actions on a different resource", () => {
      expect(permissionMatches("community:*", Permission.PROGRAM_VIEW)).toBe(false);
      expect(permissionMatches("project:*", Permission.MILESTONE_EDIT)).toBe(false);
    });

    it("includes the ':' in the prefix so it cannot over-match a resource sharing a name prefix", () => {
      // "comment:*" → prefix "comment:" must not match "community:view"
      // (both share the "comm" prefix but diverge before the colon).
      expect(permissionMatches("comment:*", Permission.COMMUNITY_VIEW)).toBe(false);
    });
  });

  describe("exact match", () => {
    it("grants only the identical permission", () => {
      expect(permissionMatches(Permission.PROJECT_EDIT, Permission.PROJECT_EDIT)).toBe(true);
    });

    it("rejects a different exact permission", () => {
      expect(permissionMatches(Permission.PROJECT_VIEW, Permission.PROJECT_EDIT)).toBe(false);
      expect(permissionMatches(Permission.COMMUNITY_VIEW, Permission.PROGRAM_VIEW)).toBe(false);
    });
  });
});
