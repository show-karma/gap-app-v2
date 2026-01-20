import { QUERY_KEYS } from "../queryKeys";

describe("queryKeys", () => {
  describe("MILESTONES", () => {
    describe("PROJECT_GRANT_MILESTONES", () => {
      it("should generate correct query key", () => {
        const key = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES("project-123", "program-456");
        expect(key).toEqual(["project-grant-milestones", "project-123", "program-456"]);
      });

      it("should return as const tuple", () => {
        const key = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES("p1", "pr1");
        expect(Array.isArray(key)).toBe(true);
        expect(key.length).toBe(3);
      });

      it("should handle different project and program IDs", () => {
        const key1 = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES("proj-a", "prog-1");
        const key2 = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES("proj-b", "prog-2");
        expect(key1).not.toEqual(key2);
      });

      it("should handle special characters in IDs", () => {
        const key = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(
          "project_with-special.chars",
          "program-123"
        );
        expect(key[1]).toBe("project_with-special.chars");
      });
    });
  });

  describe("APPLICATIONS", () => {
    describe("BY_PROJECT_UID", () => {
      it("should generate correct query key", () => {
        const key = QUERY_KEYS.APPLICATIONS.BY_PROJECT_UID("project-uid-123");
        expect(key).toEqual(["application-by-project-uid", "project-uid-123"]);
      });

      it("should return as const tuple", () => {
        const key = QUERY_KEYS.APPLICATIONS.BY_PROJECT_UID("uid-1");
        expect(Array.isArray(key)).toBe(true);
        expect(key.length).toBe(2);
      });

      it("should handle different project UIDs", () => {
        const key1 = QUERY_KEYS.APPLICATIONS.BY_PROJECT_UID("uid-a");
        const key2 = QUERY_KEYS.APPLICATIONS.BY_PROJECT_UID("uid-b");
        expect(key1).not.toEqual(key2);
      });
    });

    describe("COMMENTS", () => {
      it("should generate correct query key", () => {
        const key = QUERY_KEYS.APPLICATIONS.COMMENTS("REF-12345");
        expect(key).toEqual(["application-comments", "REF-12345"]);
      });

      it("should return as const tuple", () => {
        const key = QUERY_KEYS.APPLICATIONS.COMMENTS("REF-1");
        expect(Array.isArray(key)).toBe(true);
        expect(key.length).toBe(2);
      });

      it("should handle different reference numbers", () => {
        const key1 = QUERY_KEYS.APPLICATIONS.COMMENTS("REF-001");
        const key2 = QUERY_KEYS.APPLICATIONS.COMMENTS("REF-002");
        expect(key1).not.toEqual(key2);
      });
    });
  });

  describe("REVIEWERS", () => {
    describe("PROGRAM", () => {
      it("should generate correct query key", () => {
        const key = QUERY_KEYS.REVIEWERS.PROGRAM("program-123");
        expect(key).toEqual(["program-reviewers", "program-123"]);
      });

      it("should return as const tuple", () => {
        const key = QUERY_KEYS.REVIEWERS.PROGRAM("prog-1");
        expect(Array.isArray(key)).toBe(true);
        expect(key.length).toBe(2);
      });

      it("should handle different program IDs", () => {
        const key1 = QUERY_KEYS.REVIEWERS.PROGRAM("program-1");
        const key2 = QUERY_KEYS.REVIEWERS.PROGRAM("program-2");
        expect(key1).not.toEqual(key2);
      });
    });

    describe("MILESTONE", () => {
      it("should generate correct query key", () => {
        const key = QUERY_KEYS.REVIEWERS.MILESTONE("program-123");
        expect(key).toEqual(["milestone-reviewers", "program-123"]);
      });

      it("should return as const tuple", () => {
        const key = QUERY_KEYS.REVIEWERS.MILESTONE("prog-1");
        expect(Array.isArray(key)).toBe(true);
        expect(key.length).toBe(2);
      });

      it("should handle different program IDs", () => {
        const key1 = QUERY_KEYS.REVIEWERS.MILESTONE("program-a");
        const key2 = QUERY_KEYS.REVIEWERS.MILESTONE("program-b");
        expect(key1).not.toEqual(key2);
      });
    });
  });

  describe("CONTRACTS", () => {
    describe("VALIDATION", () => {
      it("should have ALL key", () => {
        const key = QUERY_KEYS.CONTRACTS.VALIDATION.ALL;
        expect(key).toEqual(["contract-validation"]);
      });

      it("should generate VALIDATE key with params", () => {
        const params = {
          address: "0x1234567890123456789012345678901234567890",
          network: "mainnet",
        };
        const key = QUERY_KEYS.CONTRACTS.VALIDATION.VALIDATE(params);
        expect(key).toEqual(["contract-validation", params]);
      });

      it("should handle optional excludeProjectId param", () => {
        const params = {
          address: "0x1234567890123456789012345678901234567890",
          network: "optimism",
          excludeProjectId: "project-123",
        };
        const key = QUERY_KEYS.CONTRACTS.VALIDATION.VALIDATE(params);
        expect(key).toEqual(["contract-validation", params]);
        expect(key[1]).toHaveProperty("excludeProjectId", "project-123");
      });

      it("should work without excludeProjectId", () => {
        const params = {
          address: "0xabcdef",
          network: "arbitrum",
        };
        const key = QUERY_KEYS.CONTRACTS.VALIDATION.VALIDATE(params);
        expect(key[1]).not.toHaveProperty("excludeProjectId");
      });
    });
  });

  describe("COMMUNITY", () => {
    describe("PROJECT_UPDATES", () => {
      it("should generate correct query key", () => {
        const key = QUERY_KEYS.COMMUNITY.PROJECT_UPDATES("community-123", "all", 1);
        expect(key).toEqual(["community-project-updates", "community-123", "all", 1]);
      });

      it("should return as const tuple", () => {
        const key = QUERY_KEYS.COMMUNITY.PROJECT_UPDATES("comm-1", "active", 0);
        expect(Array.isArray(key)).toBe(true);
        expect(key.length).toBe(4);
      });

      it("should handle different filters and pages", () => {
        const key1 = QUERY_KEYS.COMMUNITY.PROJECT_UPDATES("comm-1", "all", 1);
        const key2 = QUERY_KEYS.COMMUNITY.PROJECT_UPDATES("comm-1", "active", 1);
        const key3 = QUERY_KEYS.COMMUNITY.PROJECT_UPDATES("comm-1", "all", 2);
        expect(key1).not.toEqual(key2);
        expect(key1).not.toEqual(key3);
      });
    });
  });

  describe("GRANTS", () => {
    describe("DUPLICATE_CHECK", () => {
      it("should generate correct query key with all params", () => {
        const params = {
          projectUid: "project-123",
          programId: "program-456",
          community: "community-789",
          title: "Grant Title",
        };
        const key = QUERY_KEYS.GRANTS.DUPLICATE_CHECK(params);
        expect(key).toEqual(["duplicate-grant-check", params]);
      });

      it("should handle optional projectUid", () => {
        const params = {
          programId: "program-456",
          community: "community-789",
          title: "Grant Title",
        };
        const key = QUERY_KEYS.GRANTS.DUPLICATE_CHECK(params);
        expect(key[1]).not.toHaveProperty("projectUid");
      });

      it("should handle optional programId", () => {
        const params = {
          projectUid: "project-123",
          community: "community-789",
          title: "Grant Title",
        };
        const key = QUERY_KEYS.GRANTS.DUPLICATE_CHECK(params);
        expect(key[1]).not.toHaveProperty("programId");
      });

      it("should always require community and title", () => {
        const params = {
          community: "community-789",
          title: "Grant Title",
        };
        const key = QUERY_KEYS.GRANTS.DUPLICATE_CHECK(params);
        expect(key[1]).toHaveProperty("community");
        expect(key[1]).toHaveProperty("title");
      });

      it("should differentiate based on title", () => {
        const params1 = {
          community: "comm-1",
          title: "Title A",
        };
        const params2 = {
          community: "comm-1",
          title: "Title B",
        };
        const key1 = QUERY_KEYS.GRANTS.DUPLICATE_CHECK(params1);
        const key2 = QUERY_KEYS.GRANTS.DUPLICATE_CHECK(params2);
        expect(key1).not.toEqual(key2);
      });
    });
  });

  describe("PROJECT", () => {
    describe("EXPLORER_INFINITE", () => {
      it("should generate correct query key with all params", () => {
        const params = {
          search: "dao",
          sortBy: "noOfGrants",
          sortOrder: "asc",
        };
        const key = QUERY_KEYS.PROJECT.EXPLORER_INFINITE(params);
        expect(key[0]).toBe("projects-explorer-infinite");
        expect(key[1]).toBe("dao");
        expect(key[2]).toBe("noOfGrants");
        expect(key[3]).toBe("asc");
      });

      it("should use default values when params are not provided", () => {
        const key = QUERY_KEYS.PROJECT.EXPLORER_INFINITE({});
        expect(key[0]).toBe("projects-explorer-infinite");
        expect(key[1]).toBe(""); // empty search
        expect(key[2]).toBe("updatedAt"); // default sortBy
        expect(key[3]).toBe("desc"); // default sortOrder
      });

      it("should handle undefined search", () => {
        const key = QUERY_KEYS.PROJECT.EXPLORER_INFINITE({
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        expect(key[1]).toBe("");
      });

      it("should return as const tuple", () => {
        const key = QUERY_KEYS.PROJECT.EXPLORER_INFINITE({ search: "test" });
        expect(Array.isArray(key)).toBe(true);
        expect(key.length).toBe(4);
      });

      it("should generate different keys for different search queries", () => {
        const key1 = QUERY_KEYS.PROJECT.EXPLORER_INFINITE({ search: "dao" });
        const key2 = QUERY_KEYS.PROJECT.EXPLORER_INFINITE({ search: "gitcoin" });
        expect(key1).not.toEqual(key2);
      });

      it("should generate different keys for different sort options", () => {
        const key1 = QUERY_KEYS.PROJECT.EXPLORER_INFINITE({ sortBy: "createdAt" });
        const key2 = QUERY_KEYS.PROJECT.EXPLORER_INFINITE({ sortBy: "noOfGrants" });
        expect(key1).not.toEqual(key2);
      });
    });
  });

  describe("integration tests", () => {
    it("should generate unique keys for different entities", () => {
      const milestoneKey = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES("id", "prog");
      const applicationKey = QUERY_KEYS.APPLICATIONS.BY_PROJECT_UID("id");
      const reviewerKey = QUERY_KEYS.REVIEWERS.PROGRAM("id");

      expect(milestoneKey[0]).not.toBe(applicationKey[0]);
      expect(milestoneKey[0]).not.toBe(reviewerKey[0]);
      expect(applicationKey[0]).not.toBe(reviewerKey[0]);
    });

    it("should have consistent naming patterns", () => {
      expect(QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES("a", "b")[0]).toContain("milestone");
      expect(QUERY_KEYS.APPLICATIONS.BY_PROJECT_UID("a")[0]).toContain("application");
      expect(QUERY_KEYS.REVIEWERS.PROGRAM("a")[0]).toContain("reviewer");
      expect(QUERY_KEYS.CONTRACTS.VALIDATION.ALL[0]).toContain("validation");
      expect(QUERY_KEYS.COMMUNITY.PROJECT_UPDATES("a", "b", 1)[0]).toContain("community");
      expect(QUERY_KEYS.GRANTS.DUPLICATE_CHECK({ community: "a", title: "b" })[0]).toContain(
        "grant"
      );
    });

    it("should always return tuples (arrays)", () => {
      expect(Array.isArray(QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES("a", "b"))).toBe(true);
      expect(Array.isArray(QUERY_KEYS.APPLICATIONS.BY_PROJECT_UID("a"))).toBe(true);
      expect(Array.isArray(QUERY_KEYS.REVIEWERS.PROGRAM("a"))).toBe(true);
      expect(Array.isArray(QUERY_KEYS.CONTRACTS.VALIDATION.ALL)).toBe(true);
      expect(
        Array.isArray(QUERY_KEYS.CONTRACTS.VALIDATION.VALIDATE({ address: "a", network: "b" }))
      ).toBe(true);
      expect(Array.isArray(QUERY_KEYS.COMMUNITY.PROJECT_UPDATES("a", "b", 1))).toBe(true);
      expect(Array.isArray(QUERY_KEYS.GRANTS.DUPLICATE_CHECK({ community: "a", title: "b" }))).toBe(
        true
      );
    });
  });
});
