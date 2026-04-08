import {
  getMemberRole,
  getMemberRoles,
  getRoleLabel,
  getRoleShortLabel,
} from "@/components/Generic/RoleManagement/helpers";
import type { RoleMember } from "@/components/Generic/RoleManagement/types";

function createMember(overrides: Partial<RoleMember> = {}): RoleMember {
  return {
    id: "test-1",
    name: "Test User",
    email: "test@example.com",
    ...overrides,
  };
}

describe("helpers", () => {
  describe("getMemberRole", () => {
    it("returns the role from a member", () => {
      expect(getMemberRole(createMember({ role: "program" }))).toBe("program");
    });

    it("returns undefined for null/undefined", () => {
      expect(getMemberRole(null)).toBeUndefined();
      expect(getMemberRole(undefined)).toBeUndefined();
    });
  });

  describe("getMemberRoles", () => {
    it("returns roles array when present", () => {
      const member = createMember({ roles: ["program", "milestone"] });
      expect(getMemberRoles(member)).toEqual(["program", "milestone"]);
    });

    it("falls back to single role field", () => {
      const member = createMember({ role: "program" });
      expect(getMemberRoles(member)).toEqual(["program"]);
    });

    it("returns empty array for null/undefined", () => {
      expect(getMemberRoles(null)).toEqual([]);
      expect(getMemberRoles(undefined)).toEqual([]);
    });

    it("returns empty array when no roles set", () => {
      expect(getMemberRoles(createMember())).toEqual([]);
    });

    it("prefers roles array over single role", () => {
      const member = createMember({ role: "program", roles: ["milestone"] });
      expect(getMemberRoles(member)).toEqual(["milestone"]);
    });
  });

  describe("getRoleLabel", () => {
    it("returns Program Reviewer for program role", () => {
      expect(getRoleLabel("program")).toBe("Program Reviewer");
    });

    it("returns Milestone Reviewer for milestone role", () => {
      expect(getRoleLabel("milestone")).toBe("Milestone Reviewer");
    });

    it("returns empty string for undefined", () => {
      expect(getRoleLabel(undefined)).toBe("");
    });
  });

  describe("getRoleShortLabel", () => {
    it("returns App for program role", () => {
      expect(getRoleShortLabel("program")).toBe("App");
    });

    it("returns Milestone for milestone role", () => {
      expect(getRoleShortLabel("milestone")).toBe("Milestone");
    });

    it("returns empty string for undefined", () => {
      expect(getRoleShortLabel(undefined)).toBe("");
    });
  });
});
