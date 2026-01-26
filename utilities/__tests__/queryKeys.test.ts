import type { Query } from "@tanstack/react-query";
import { createProjectQueryPredicate, QUERY_KEYS } from "../queryKeys";

// Helper to create a mock Query object for testing predicates
const createMockQuery = (queryKey: unknown[]): Query => {
  return { queryKey } as Query;
};

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
          limit: 25,
        };
        const key = QUERY_KEYS.PROJECT.EXPLORER_INFINITE(params);
        expect(key[0]).toBe("projects-explorer-infinite");
        expect(key[1]).toBe("dao");
        expect(key[2]).toBe("noOfGrants");
        expect(key[3]).toBe("asc");
        expect(key[4]).toBe(25);
      });

      it("should use default values when params are not provided", () => {
        const key = QUERY_KEYS.PROJECT.EXPLORER_INFINITE({});
        expect(key[0]).toBe("projects-explorer-infinite");
        expect(key[1]).toBe(""); // empty search
        expect(key[2]).toBe("updatedAt"); // default sortBy
        expect(key[3]).toBe("desc"); // default sortOrder
        expect(key[4]).toBe(50); // default limit
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
        expect(key.length).toBe(5);
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

      it("should generate different keys for different limit values", () => {
        const key1 = QUERY_KEYS.PROJECT.EXPLORER_INFINITE({ limit: 25 });
        const key2 = QUERY_KEYS.PROJECT.EXPLORER_INFINITE({ limit: 100 });
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

describe("createProjectQueryPredicate", () => {
  const projectId = "0x1234567890abcdef";
  const projectSlug = "my-awesome-project";

  describe("matching project queries", () => {
    it("should match project details query by project ID", () => {
      const predicate = createProjectQueryPredicate(projectId);
      const query = createMockQuery(QUERY_KEYS.PROJECT.DETAILS(projectId));

      expect(predicate(query)).toBe(true);
    });

    it("should match project details query by project slug", () => {
      const predicate = createProjectQueryPredicate(projectSlug);
      const query = createMockQuery(QUERY_KEYS.PROJECT.DETAILS(projectSlug));

      expect(predicate(query)).toBe(true);
    });

    it("should match project-updates query", () => {
      const predicate = createProjectQueryPredicate(projectId);
      const query = createMockQuery(QUERY_KEYS.PROJECT.UPDATES(projectId));

      expect(predicate(query)).toBe(true);
    });

    it("should match project-impacts query", () => {
      const predicate = createProjectQueryPredicate(projectId);
      const query = createMockQuery(QUERY_KEYS.PROJECT.IMPACTS(projectId));

      expect(predicate(query)).toBe(true);
    });

    it("should match project-milestones query", () => {
      const predicate = createProjectQueryPredicate(projectId);
      const query = createMockQuery(QUERY_KEYS.PROJECT.MILESTONES(projectId));

      expect(predicate(query)).toBe(true);
    });

    it("should match project-grants query", () => {
      const predicate = createProjectQueryPredicate(projectId);
      const query = createMockQuery(QUERY_KEYS.PROJECT.GRANTS(projectId));

      expect(predicate(query)).toBe(true);
    });

    it("should match legacy projectMilestones query format", () => {
      const predicate = createProjectQueryPredicate(projectId);
      const query = createMockQuery(["projectMilestones", projectId]);

      expect(predicate(query)).toBe(true);
    });
  });

  describe("case-insensitive matching", () => {
    it("should match project ID regardless of case", () => {
      const predicate = createProjectQueryPredicate(projectId.toLowerCase());
      const query = createMockQuery(QUERY_KEYS.PROJECT.DETAILS(projectId.toUpperCase()));

      expect(predicate(query)).toBe(true);
    });

    it("should match project slug regardless of case", () => {
      const predicate = createProjectQueryPredicate(projectSlug.toUpperCase());
      const query = createMockQuery(QUERY_KEYS.PROJECT.DETAILS(projectSlug.toLowerCase()));

      expect(predicate(query)).toBe(true);
    });
  });

  describe("non-matching scenarios", () => {
    it("should not match queries for different projects", () => {
      const predicate = createProjectQueryPredicate(projectId);
      const otherProjectId = "0xdifferentproject";
      const query = createMockQuery(QUERY_KEYS.PROJECT.DETAILS(otherProjectId));

      expect(predicate(query)).toBe(false);
    });

    it("should not match non-project queries", () => {
      const predicate = createProjectQueryPredicate(projectId);

      // Test various non-project query keys
      expect(predicate(createMockQuery(["applications", projectId]))).toBe(false);
      expect(predicate(createMockQuery(["community-details", projectId]))).toBe(false);
      expect(predicate(createMockQuery(["staffAuthorization", projectId]))).toBe(false);
      expect(predicate(createMockQuery(["donations", "project", projectId]))).toBe(false);
    });

    it("should not match empty query keys", () => {
      const predicate = createProjectQueryPredicate(projectId);
      const query = createMockQuery([]);

      expect(predicate(query)).toBe(false);
    });

    it("should not match query keys with only the prefix", () => {
      const predicate = createProjectQueryPredicate(projectId);
      const query = createMockQuery(["project"]);

      expect(predicate(query)).toBe(false);
    });

    it("should not match when project ID is at index 0", () => {
      const predicate = createProjectQueryPredicate(projectId);
      // This should not match because the projectId is at index 0
      const query = createMockQuery([projectId, "project"]);

      expect(predicate(query)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle queries with non-array keys gracefully", () => {
      const predicate = createProjectQueryPredicate(projectId);
      const query = { queryKey: null } as unknown as Query;

      // Should return false without throwing
      expect(predicate(query)).toBe(false);
    });

    it("should handle queries with non-string key parts", () => {
      const predicate = createProjectQueryPredicate(projectId);
      const query = createMockQuery(["project", 12345, projectId]);

      // Should still match because projectId is at index 2
      expect(predicate(query)).toBe(true);
    });

    it("should handle special characters in project IDs", () => {
      const specialId = "project_with-special.chars_123";
      const predicate = createProjectQueryPredicate(specialId);
      const query = createMockQuery(QUERY_KEYS.PROJECT.DETAILS(specialId));

      expect(predicate(query)).toBe(true);
    });

    it("should handle ethereum addresses as project IDs", () => {
      const ethereumAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f1dBf3";
      const predicate = createProjectQueryPredicate(ethereumAddress);
      const query = createMockQuery(QUERY_KEYS.PROJECT.DETAILS(ethereumAddress));

      expect(predicate(query)).toBe(true);
    });
  });

  describe("matching all PROJECT query types", () => {
    it("should match all QUERY_KEYS.PROJECT types for same project", () => {
      const predicate = createProjectQueryPredicate(projectId);

      const projectQueryTypes = [
        QUERY_KEYS.PROJECT.DETAILS(projectId),
        QUERY_KEYS.PROJECT.UPDATES(projectId),
        QUERY_KEYS.PROJECT.IMPACTS(projectId),
        QUERY_KEYS.PROJECT.MILESTONES(projectId),
        QUERY_KEYS.PROJECT.GRANTS(projectId),
      ];

      projectQueryTypes.forEach((queryKey) => {
        const query = createMockQuery(queryKey);
        expect(predicate(query)).toBe(true);
      });
    });

    it("should not match any PROJECT query types for different project", () => {
      const predicate = createProjectQueryPredicate(projectId);
      const differentProject = "0xdifferent";

      const projectQueryTypes = [
        QUERY_KEYS.PROJECT.DETAILS(differentProject),
        QUERY_KEYS.PROJECT.UPDATES(differentProject),
        QUERY_KEYS.PROJECT.IMPACTS(differentProject),
        QUERY_KEYS.PROJECT.MILESTONES(differentProject),
        QUERY_KEYS.PROJECT.GRANTS(differentProject),
      ];

      projectQueryTypes.forEach((queryKey) => {
        const query = createMockQuery(queryKey);
        expect(predicate(query)).toBe(false);
      });
    });
  });
});
