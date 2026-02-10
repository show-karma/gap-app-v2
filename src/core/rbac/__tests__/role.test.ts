import {
  getHighestRole,
  getRoleLevel,
  isRoleAtLeast,
  isValidReviewerType,
  isValidRole,
  ReviewerType,
  ROLE_HIERARCHY,
  Role,
} from "../types/role";

describe("Role Types", () => {
  describe("Role enum", () => {
    it("should have all expected roles", () => {
      expect(Role.SUPER_ADMIN).toBe("SUPER_ADMIN");
      expect(Role.REGISTRY_ADMIN).toBe("REGISTRY_ADMIN");
      expect(Role.COMMUNITY_ADMIN).toBe("COMMUNITY_ADMIN");
      expect(Role.PROGRAM_ADMIN).toBe("PROGRAM_ADMIN");
      expect(Role.PROGRAM_CREATOR).toBe("PROGRAM_CREATOR");
      expect(Role.PROGRAM_REVIEWER).toBe("PROGRAM_REVIEWER");
      expect(Role.MILESTONE_REVIEWER).toBe("MILESTONE_REVIEWER");
      expect(Role.APPLICANT).toBe("APPLICANT");
      expect(Role.GUEST).toBe("GUEST");
      expect(Role.NONE).toBe("NONE");
    });

    it("should have exactly 10 roles", () => {
      expect(Object.values(Role)).toHaveLength(10);
    });
  });

  describe("ROLE_HIERARCHY", () => {
    it("should assign NONE level -1", () => {
      expect(ROLE_HIERARCHY[Role.NONE]).toBe(-1);
    });

    it("should assign GUEST level 0", () => {
      expect(ROLE_HIERARCHY[Role.GUEST]).toBe(0);
    });

    it("should assign APPLICANT level 1", () => {
      expect(ROLE_HIERARCHY[Role.APPLICANT]).toBe(1);
    });

    it("should assign reviewers level 2", () => {
      expect(ROLE_HIERARCHY[Role.PROGRAM_REVIEWER]).toBe(2);
      expect(ROLE_HIERARCHY[Role.MILESTONE_REVIEWER]).toBe(2);
    });

    it("should assign PROGRAM_ADMIN and PROGRAM_CREATOR level 3", () => {
      expect(ROLE_HIERARCHY[Role.PROGRAM_ADMIN]).toBe(3);
      expect(ROLE_HIERARCHY[Role.PROGRAM_CREATOR]).toBe(3);
    });

    it("should assign COMMUNITY_ADMIN level 4", () => {
      expect(ROLE_HIERARCHY[Role.COMMUNITY_ADMIN]).toBe(4);
    });

    it("should assign REGISTRY_ADMIN level 5", () => {
      expect(ROLE_HIERARCHY[Role.REGISTRY_ADMIN]).toBe(5);
    });

    it("should assign SUPER_ADMIN level 6", () => {
      expect(ROLE_HIERARCHY[Role.SUPER_ADMIN]).toBe(6);
    });
  });

  describe("ReviewerType", () => {
    it("should have PROGRAM and MILESTONE types", () => {
      expect(ReviewerType.PROGRAM).toBe("PROGRAM");
      expect(ReviewerType.MILESTONE).toBe("MILESTONE");
    });
  });

  describe("getRoleLevel", () => {
    it("should return correct level for each role", () => {
      expect(getRoleLevel(Role.NONE)).toBe(-1);
      expect(getRoleLevel(Role.GUEST)).toBe(0);
      expect(getRoleLevel(Role.APPLICANT)).toBe(1);
      expect(getRoleLevel(Role.PROGRAM_REVIEWER)).toBe(2);
      expect(getRoleLevel(Role.MILESTONE_REVIEWER)).toBe(2);
      expect(getRoleLevel(Role.PROGRAM_ADMIN)).toBe(3);
      expect(getRoleLevel(Role.PROGRAM_CREATOR)).toBe(3);
      expect(getRoleLevel(Role.COMMUNITY_ADMIN)).toBe(4);
      expect(getRoleLevel(Role.REGISTRY_ADMIN)).toBe(5);
      expect(getRoleLevel(Role.SUPER_ADMIN)).toBe(6);
    });

    it("should return 0 for unknown role", () => {
      expect(getRoleLevel("UNKNOWN" as Role)).toBe(0);
    });
  });

  describe("isRoleAtLeast", () => {
    it("should return true when user role equals required role", () => {
      expect(isRoleAtLeast(Role.PROGRAM_ADMIN, Role.PROGRAM_ADMIN)).toBe(true);
    });

    it("should return true when user role is higher than required", () => {
      expect(isRoleAtLeast(Role.SUPER_ADMIN, Role.GUEST)).toBe(true);
      expect(isRoleAtLeast(Role.COMMUNITY_ADMIN, Role.PROGRAM_ADMIN)).toBe(true);
    });

    it("should return false when user role is lower than required", () => {
      expect(isRoleAtLeast(Role.GUEST, Role.PROGRAM_ADMIN)).toBe(false);
      expect(isRoleAtLeast(Role.APPLICANT, Role.PROGRAM_REVIEWER)).toBe(false);
    });

    it("should handle same-level reviewers", () => {
      expect(isRoleAtLeast(Role.PROGRAM_REVIEWER, Role.MILESTONE_REVIEWER)).toBe(true);
      expect(isRoleAtLeast(Role.MILESTONE_REVIEWER, Role.PROGRAM_REVIEWER)).toBe(true);
    });
  });

  describe("getHighestRole", () => {
    it("should return GUEST for empty array", () => {
      expect(getHighestRole([])).toBe(Role.GUEST);
    });

    it("should return the single role for single-element array", () => {
      expect(getHighestRole([Role.PROGRAM_ADMIN])).toBe(Role.PROGRAM_ADMIN);
    });

    it("should return highest role from array", () => {
      expect(getHighestRole([Role.GUEST, Role.APPLICANT, Role.SUPER_ADMIN])).toBe(Role.SUPER_ADMIN);
    });

    it("should return COMMUNITY_ADMIN over PROGRAM_ADMIN", () => {
      expect(getHighestRole([Role.PROGRAM_ADMIN, Role.COMMUNITY_ADMIN])).toBe(Role.COMMUNITY_ADMIN);
    });

    it("should return SUPER_ADMIN over REGISTRY_ADMIN", () => {
      expect(getHighestRole([Role.REGISTRY_ADMIN, Role.SUPER_ADMIN])).toBe(Role.SUPER_ADMIN);
    });
  });

  describe("isValidRole", () => {
    it("should return true for valid roles", () => {
      expect(isValidRole("SUPER_ADMIN")).toBe(true);
      expect(isValidRole("REGISTRY_ADMIN")).toBe(true);
      expect(isValidRole("COMMUNITY_ADMIN")).toBe(true);
      expect(isValidRole("PROGRAM_ADMIN")).toBe(true);
      expect(isValidRole("PROGRAM_CREATOR")).toBe(true);
      expect(isValidRole("PROGRAM_REVIEWER")).toBe(true);
      expect(isValidRole("MILESTONE_REVIEWER")).toBe(true);
      expect(isValidRole("APPLICANT")).toBe(true);
      expect(isValidRole("GUEST")).toBe(true);
      expect(isValidRole("NONE")).toBe(true);
    });

    it("should return false for invalid roles", () => {
      expect(isValidRole("UNKNOWN")).toBe(false);
      expect(isValidRole("")).toBe(false);
      expect(isValidRole("admin")).toBe(false);
      expect(isValidRole("super_admin")).toBe(false);
    });
  });

  describe("isValidReviewerType", () => {
    it("should return true for valid reviewer types", () => {
      expect(isValidReviewerType("PROGRAM")).toBe(true);
      expect(isValidReviewerType("MILESTONE")).toBe(true);
    });

    it("should return false for invalid reviewer types", () => {
      expect(isValidReviewerType("UNKNOWN")).toBe(false);
      expect(isValidReviewerType("")).toBe(false);
      expect(isValidReviewerType("program")).toBe(false);
    });
  });
});
