/**
 * Tests for project-profile.service.ts data transformation functions.
 *
 * The project-profile service is purely data transformation (no API calls),
 * so we test the business logic directly:
 * - transformImpactsToMilestones
 * - transformGrantsToMilestones
 * - combineUpdatesAndImpacts
 * - filterActivities
 * - sortActivities
 * - calculateProfileStats
 * - aggregateProjectProfileData
 */

import type { ProjectImpact } from "@/services/project-impacts.service";
import {
  aggregateProjectProfileData,
  calculateProfileStats,
  combineUpdatesAndImpacts,
  countActualMilestones,
  countCompletedMilestones,
  filterActivities,
  filterActualMilestones,
  getActivityFilterType,
  processActivities,
  sortActivities,
  transformEndorsementsToMilestones,
  transformGrantsToMilestones,
  transformImpactsToMilestones,
} from "@/services/project-profile.service";
import type { Grant } from "@/types/v2/grant";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

function createMockImpact(overrides?: Partial<ProjectImpact>): ProjectImpact {
  return {
    uid: "impact-001",
    refUID: "ref-001",
    chainID: 10,
    createdAt: "2024-06-01T00:00:00Z",
    data: {
      work: "Built SDK integration",
      impact: "Enabled 100+ projects",
      proof: "https://github.com/proof",
      startDate: 1700000000,
      endDate: 1705000000,
    },
    verified: [],
    ...overrides,
  };
}

function createMockGrant(overrides?: Partial<Grant>): Grant {
  return {
    uid: "grant-001",
    chainID: 10,
    createdAt: "2024-05-01T00:00:00Z",
    amount: "80000",
    details: {
      title: "Infrastructure Grant",
      description: "Funding for infrastructure",
      amount: "80000",
      currency: "USDC",
    },
    community: {
      details: {
        name: "Ethereum Foundation",
        slug: "ef",
        imageURL: "https://example.com/ef.png",
      },
    },
    ...overrides,
  } as Grant;
}

function createMockMilestone(overrides?: Partial<UnifiedMilestone>): UnifiedMilestone {
  return {
    uid: "ms-001",
    type: "milestone",
    title: "Phase 1 Complete",
    createdAt: "2024-07-01T00:00:00Z",
    completed: false,
    chainID: 10,
    refUID: "ref-001",
    source: { type: "milestone" },
    ...overrides,
  };
}

describe("project-profile.service transformations", () => {
  describe("transformImpactsToMilestones", () => {
    it("transforms impacts into unified milestone format", () => {
      const impacts = [createMockImpact()];
      const result = transformImpactsToMilestones(impacts);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("impact");
      expect(result[0].title).toBe("Built SDK integration");
      expect(result[0].uid).toBe("impact-001");
      expect(result[0].completed).toBe(false);
    });

    it("uses fallback title when work is missing", () => {
      const impacts = [createMockImpact({ data: undefined as any })];
      const result = transformImpactsToMilestones(impacts);

      expect(result[0].title).toBe("Impact");
    });

    it("handles empty array", () => {
      expect(transformImpactsToMilestones([])).toEqual([]);
    });
  });

  describe("transformGrantsToMilestones", () => {
    it("transforms grants into grant_received milestones", () => {
      const grants = [createMockGrant()];
      const result = transformGrantsToMilestones(grants);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("grant_received");
      expect(result[0].title).toBe("Infrastructure Grant");
      expect(result[0].uid).toBe("grant-received-grant-001");
      expect(result[0].grantReceived?.amount).toBe("80000 USDC");
      expect(result[0].grantReceived?.communityName).toBe("Ethereum Foundation");
    });

    it("does not duplicate currency when amount already includes it", () => {
      const grants = [
        createMockGrant({
          details: { amount: "80000 USDC", currency: "USDC", title: "Grant" } as any,
        }),
      ];
      const result = transformGrantsToMilestones(grants);

      // Should not become "80000 USDC USDC"
      expect(result[0].grantReceived?.amount).toBe("80000 USDC");
    });
  });

  describe("transformEndorsementsToMilestones", () => {
    it("transforms endorsements into endorsement milestones", () => {
      const endorsements = [
        {
          uid: "end-001",
          endorsedBy: "0xEndorser",
          comment: "Great project!",
          createdAt: "2024-08-01T00:00:00Z",
        },
      ];

      const result = transformEndorsementsToMilestones(endorsements);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("endorsement");
      expect(result[0].endorsement?.endorsedBy).toBe("0xEndorser");
      expect(result[0].endorsement?.comment).toBe("Great project!");
    });
  });

  describe("combineUpdatesAndImpacts", () => {
    it("combines milestones, impacts, grants, and endorsements", () => {
      const milestones = [createMockMilestone()];
      const impacts = [createMockImpact()];
      const grants = [createMockGrant()];
      const endorsements = [
        { uid: "e1", endorsedBy: "0xA", comment: "Good", createdAt: "2024-09-01T00:00:00Z" },
      ];

      const result = combineUpdatesAndImpacts(milestones, impacts, grants, endorsements);

      expect(result.length).toBe(4);
      const types = result.map((r) => r.type);
      expect(types).toContain("milestone");
      expect(types).toContain("impact");
      expect(types).toContain("grant_received");
      expect(types).toContain("endorsement");
    });
  });

  describe("filterActualMilestones", () => {
    it("filters only milestone and grant types", () => {
      const items: UnifiedMilestone[] = [
        createMockMilestone({ type: "milestone" }),
        createMockMilestone({ type: "grant", uid: "g1" }),
        createMockMilestone({ type: "impact", uid: "i1" }),
        createMockMilestone({ type: "update", uid: "u1" }),
      ];

      const result = filterActualMilestones(items);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.type)).toEqual(["milestone", "grant"]);
    });
  });

  describe("countActualMilestones / countCompletedMilestones", () => {
    it("counts correctly", () => {
      const items: UnifiedMilestone[] = [
        createMockMilestone({ type: "milestone", completed: true }),
        createMockMilestone({ type: "grant", uid: "g1", completed: false }),
        createMockMilestone({ type: "impact", uid: "i1", completed: true }),
      ];

      expect(countActualMilestones(items)).toBe(2); // milestone + grant
      expect(countCompletedMilestones(items)).toBe(1); // only the completed milestone
    });
  });

  describe("sortActivities", () => {
    it("sorts newest first", () => {
      const items = [
        createMockMilestone({ createdAt: "2024-01-01T00:00:00Z", uid: "old" }),
        createMockMilestone({ createdAt: "2024-12-01T00:00:00Z", uid: "new" }),
      ];

      const result = sortActivities(items, "newest");
      expect(result[0].uid).toBe("new");
      expect(result[1].uid).toBe("old");
    });

    it("sorts oldest first", () => {
      const items = [
        createMockMilestone({ createdAt: "2024-12-01T00:00:00Z", uid: "new" }),
        createMockMilestone({ createdAt: "2024-01-01T00:00:00Z", uid: "old" }),
      ];

      const result = sortActivities(items, "oldest");
      expect(result[0].uid).toBe("old");
      expect(result[1].uid).toBe("new");
    });
  });

  describe("getActivityFilterType", () => {
    it("maps types correctly", () => {
      expect(getActivityFilterType(createMockMilestone({ type: "grant_received" }))).toBe(
        "funding"
      );
      expect(getActivityFilterType(createMockMilestone({ type: "milestone" }))).toBe("milestones");
      expect(getActivityFilterType(createMockMilestone({ type: "grant" }))).toBe("milestones");
      expect(getActivityFilterType(createMockMilestone({ type: "grant_update" }))).toBe("updates");
      expect(getActivityFilterType(createMockMilestone({ type: "update" }))).toBe("updates");
      expect(getActivityFilterType(createMockMilestone({ type: "endorsement" }))).toBe(
        "endorsements"
      );
      expect(getActivityFilterType(createMockMilestone({ type: "impact" }))).toBe("other");
    });
  });

  describe("filterActivities", () => {
    it("returns all when no filters active", () => {
      const items = [
        createMockMilestone({ type: "milestone" }),
        createMockMilestone({ type: "impact", uid: "i1" }),
      ];

      expect(filterActivities(items, [])).toHaveLength(2);
    });

    it("filters by active filter types", () => {
      const items = [
        createMockMilestone({ type: "milestone" }),
        createMockMilestone({ type: "grant_received", uid: "gr1" }),
        createMockMilestone({ type: "impact", uid: "i1" }),
      ];

      const result = filterActivities(items, ["milestones"]);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("milestone");
    });
  });

  describe("processActivities", () => {
    it("applies both filter and sort", () => {
      const items = [
        createMockMilestone({ type: "milestone", createdAt: "2024-01-01T00:00:00Z", uid: "old" }),
        createMockMilestone({ type: "milestone", createdAt: "2024-12-01T00:00:00Z", uid: "new" }),
        createMockMilestone({ type: "impact", uid: "i1" }),
      ];

      const result = processActivities(items, "newest", ["milestones"]);
      expect(result).toHaveLength(2);
      expect(result[0].uid).toBe("new");
      expect(result[1].uid).toBe("old");
    });
  });

  describe("calculateProfileStats", () => {
    it("calculates stats correctly", () => {
      const grants = [createMockGrant(), createMockGrant({ uid: "g2" })];
      const updates: UnifiedMilestone[] = [
        createMockMilestone({ type: "milestone", completed: true }),
        createMockMilestone({ type: "grant", uid: "g1", completed: false }),
        createMockMilestone({
          type: "update",
          uid: "u1",
          createdAt: "2024-12-01T00:00:00Z",
        }),
      ];

      const project = {
        endorsements: [
          { endorsedBy: "0xA" },
          { endorsedBy: "0xB" },
          { endorsedBy: "0xa" }, // Duplicate (lowercase match)
        ],
      } as any;

      const stats = calculateProfileStats(project, grants, updates);

      expect(stats.grantsCount).toBe(2);
      expect(stats.endorsementsCount).toBe(2); // 0xa and 0xb, deduplicated
      expect(stats.completeRate).toBe(50); // 1 of 2 actual milestones completed
      expect(stats.lastUpdate).toBeInstanceOf(Date);
    });

    it("returns undefined completeRate when no milestones", () => {
      const stats = calculateProfileStats(null, [], []);
      expect(stats.completeRate).toBeUndefined();
      expect(stats.grantsCount).toBe(0);
    });
  });

  describe("aggregateProjectProfileData", () => {
    it("aggregates all data sources", () => {
      const project = { endorsements: [] } as any;
      const grants = [createMockGrant()];
      const milestones = [createMockMilestone()];
      const impacts = [createMockImpact()];

      const result = aggregateProjectProfileData(project, grants, milestones, impacts);

      expect(result.isVerified).toBe(true); // has grants
      expect(result.allUpdates.length).toBeGreaterThan(0);
      expect(result.stats).toBeDefined();
    });

    it("marks project as unverified when no grants", () => {
      const result = aggregateProjectProfileData(null, [], [], []);
      expect(result.isVerified).toBe(false);
      expect(result.milestonesCount).toBe(0);
    });
  });
});
