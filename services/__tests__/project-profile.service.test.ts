import type { Grant } from "@/types/v2/grant";
import type { Project } from "@/types/v2/project";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import type { ProjectImpact } from "../project-impacts.service";
import {
  aggregateProjectProfileData,
  calculateProfileStats,
  combineUpdatesAndImpacts,
  countCompletedMilestones,
  determineProjectVerification,
  filterActivities,
  getActivityFilterType,
  processActivities,
  sortActivities,
  transformGrantsToMilestones,
  transformImpactsToMilestones,
} from "../project-profile.service";

// =============================================================================
// Test Data Fixtures
// =============================================================================

const mockImpact: ProjectImpact = {
  uid: "impact-1",
  refUID: "ref-1",
  chainID: 1,
  data: {
    work: "Work done",
    impact: "Impact achieved",
  },
  createdAt: "2024-01-15T10:00:00Z",
};

const mockMilestone: UnifiedMilestone = {
  uid: "milestone-1",
  type: "milestone",
  title: "Milestone 1",
  description: "Description",
  completed: true,
  createdAt: "2024-01-10T10:00:00Z",
  chainID: 1,
  refUID: "ref-1",
  source: { type: "milestone" },
};

const mockGrant: Grant = {
  uid: "0x1234" as `0x${string}`,
  chainID: 1,
  refUID: "0x5678" as `0x${string}`,
  recipient: "0xabcd" as `0x${string}`,
  createdAt: "2024-01-20T10:00:00Z",
  details: {
    title: "Test Grant",
    amount: "10000",
    currency: "USDC",
    description: "Grant description",
  },
  community: {
    uid: "community-1",
    chainID: 1,
    details: {
      name: "Test Community",
      slug: "test-community",
      imageURL: "https://example.com/logo.png",
    },
  },
};

const mockProject: Project = {
  uid: "0x1234" as `0x${string}`,
  chainID: 1,
  owner: "0xabcd" as `0x${string}`,
  details: {
    title: "Test Project",
    description: "Description",
    slug: "test-project",
  },
  members: [],
  endorsements: [{ id: "1" }, { id: "2" }],
};

// =============================================================================
// transformImpactsToMilestones Tests
// =============================================================================

describe("transformImpactsToMilestones", () => {
  it("should transform impacts to unified milestone format", () => {
    const result = transformImpactsToMilestones([mockImpact]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      uid: "impact-1",
      type: "impact",
      title: "Work done",
      description: "Impact achieved",
      createdAt: "2024-01-15T10:00:00Z",
      completed: false,
      chainID: 1,
      refUID: "ref-1",
      source: { type: "impact" },
    });
  });

  it("should use default title when work is missing", () => {
    const impactNoWork: ProjectImpact = {
      ...mockImpact,
      data: { impact: "Impact only" },
    };

    const result = transformImpactsToMilestones([impactNoWork]);
    expect(result[0].title).toBe("Impact");
  });

  it("should use current date when createdAt is missing", () => {
    const impactNoDate: ProjectImpact = {
      ...mockImpact,
      createdAt: undefined,
    };

    const result = transformImpactsToMilestones([impactNoDate]);
    expect(result[0].createdAt).toBeDefined();
  });

  it("should return empty array for empty input", () => {
    const result = transformImpactsToMilestones([]);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// transformGrantsToMilestones Tests
// =============================================================================

describe("transformGrantsToMilestones", () => {
  it("should transform grants to grant_received milestone format", () => {
    const result = transformGrantsToMilestones([mockGrant]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      uid: "grant-received-0x1234",
      type: "grant_received",
      title: "Test Grant",
      description: "Grant description",
      createdAt: "2024-01-20T10:00:00Z",
      completed: false,
      chainID: 1,
      refUID: "0x1234",
      source: { type: "grant_received" },
      grantReceived: {
        amount: "10000 USDC", // Combined amount and currency
        currency: "USDC",
        communityName: "Test Community",
        communitySlug: "test-community",
        communityImage: "https://example.com/logo.png",
        grantTitle: "Test Grant",
        grantUID: "0x1234",
      },
    });
  });

  it("should use default title when grant title is missing", () => {
    const grantNoTitle: Grant = {
      ...mockGrant,
      details: { ...mockGrant.details, title: undefined } as any,
    };

    const result = transformGrantsToMilestones([grantNoTitle]);
    expect(result[0].title).toBe("Grant Received");
  });

  it("should use current date when createdAt is missing", () => {
    const grantNoDate: Grant = {
      ...mockGrant,
      createdAt: undefined,
    };

    const result = transformGrantsToMilestones([grantNoDate]);
    expect(result[0].createdAt).toBeDefined();
  });

  it("should handle grant without community", () => {
    const grantNoCommunity: Grant = {
      ...mockGrant,
      community: undefined,
    };

    const result = transformGrantsToMilestones([grantNoCommunity]);
    expect(result[0].grantReceived?.communityName).toBeUndefined();
    expect(result[0].grantReceived?.communityImage).toBeUndefined();
  });

  it("should return empty array for empty input", () => {
    const result = transformGrantsToMilestones([]);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// combineUpdatesAndImpacts Tests
// =============================================================================

describe("combineUpdatesAndImpacts", () => {
  it("should combine milestones, impacts, and grants", () => {
    const milestones = [mockMilestone];
    const impacts = [mockImpact];
    const grants = [mockGrant];

    const result = combineUpdatesAndImpacts(milestones, impacts, grants);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(mockMilestone);
    expect(result[1].type).toBe("impact");
    expect(result[2].type).toBe("grant_received");
  });

  it("should handle empty milestones", () => {
    const result = combineUpdatesAndImpacts([], [mockImpact]);
    expect(result).toHaveLength(1);
  });

  it("should handle empty impacts", () => {
    const result = combineUpdatesAndImpacts([mockMilestone], []);
    expect(result).toHaveLength(1);
  });

  it("should handle both empty", () => {
    const result = combineUpdatesAndImpacts([], []);
    expect(result).toEqual([]);
  });

  it("should include grants when provided", () => {
    const result = combineUpdatesAndImpacts([mockMilestone], [], [mockGrant]);

    expect(result).toHaveLength(2);
    expect(result[1].type).toBe("grant_received");
    expect(result[1].grantReceived?.amount).toBe("10000 USDC");
  });
});

// =============================================================================
// countCompletedMilestones Tests
// =============================================================================

describe("countCompletedMilestones", () => {
  it("should count completed milestones", () => {
    const milestones: UnifiedMilestone[] = [
      { ...mockMilestone, completed: true },
      { ...mockMilestone, uid: "2", completed: false },
      { ...mockMilestone, uid: "3", completed: { createdAt: "2024-01-01", data: {} } },
    ];

    const result = countCompletedMilestones(milestones);
    expect(result).toBe(2);
  });

  it("should return 0 for no completed milestones", () => {
    const milestones: UnifiedMilestone[] = [{ ...mockMilestone, completed: false }];

    const result = countCompletedMilestones(milestones);
    expect(result).toBe(0);
  });

  it("should return 0 for empty array", () => {
    const result = countCompletedMilestones([]);
    expect(result).toBe(0);
  });
});

// =============================================================================
// determineProjectVerification Tests
// =============================================================================

describe("determineProjectVerification", () => {
  it("should return true when grants exist", () => {
    const result = determineProjectVerification([mockGrant]);
    expect(result).toBe(true);
  });

  it("should return false when no grants", () => {
    const result = determineProjectVerification([]);
    expect(result).toBe(false);
  });
});

// =============================================================================
// calculateProfileStats Tests
// =============================================================================

describe("calculateProfileStats", () => {
  it("should calculate stats correctly", () => {
    const updates = [mockMilestone];
    const result = calculateProfileStats(mockProject, [mockGrant], updates);

    expect(result).toEqual({
      grantsCount: 1,
      endorsementsCount: 2,
      lastUpdate: new Date("2024-01-10T10:00:00Z"),
      completeRate: 100,
    });
  });

  it("should handle null project", () => {
    const result = calculateProfileStats(null, [mockGrant], [mockMilestone]);

    expect(result.endorsementsCount).toBe(0);
    expect(result.grantsCount).toBe(1);
  });

  it("should handle no updates", () => {
    const result = calculateProfileStats(mockProject, [], []);

    expect(result.lastUpdate).toBeUndefined();
  });

  it("should handle project without endorsements", () => {
    const projectNoEndorsements = { ...mockProject, endorsements: undefined };
    const result = calculateProfileStats(projectNoEndorsements as Project, [], []);

    expect(result.endorsementsCount).toBe(0);
  });
});

// =============================================================================
// aggregateProjectProfileData Tests
// =============================================================================

describe("aggregateProjectProfileData", () => {
  it("should aggregate all data correctly including grant_received items", () => {
    const result = aggregateProjectProfileData(
      mockProject,
      [mockGrant],
      [mockMilestone],
      [mockImpact]
    );

    expect(result.isVerified).toBe(true);
    // Should include: 1 milestone + 1 impact + 1 grant_received
    expect(result.allUpdates).toHaveLength(3);
    expect(result.completedCount).toBe(1);
    expect(result.stats.grantsCount).toBe(1);
    expect(result.stats.endorsementsCount).toBe(2);

    // Verify grant_received item is included
    const grantReceivedItem = result.allUpdates.find((u) => u.type === "grant_received");
    expect(grantReceivedItem).toBeDefined();
    expect(grantReceivedItem?.grantReceived?.amount).toBe("10000 USDC");
  });

  it("should handle empty data", () => {
    const result = aggregateProjectProfileData(null, [], [], []);

    expect(result.isVerified).toBe(false);
    expect(result.allUpdates).toEqual([]);
    expect(result.completedCount).toBe(0);
    expect(result.stats.grantsCount).toBe(0);
  });
});

// =============================================================================
// sortActivities Tests
// =============================================================================

describe("sortActivities", () => {
  const items: UnifiedMilestone[] = [
    { ...mockMilestone, uid: "1", createdAt: "2024-01-01T10:00:00Z" },
    { ...mockMilestone, uid: "2", createdAt: "2024-01-15T10:00:00Z" },
    { ...mockMilestone, uid: "3", createdAt: "2024-01-10T10:00:00Z" },
  ];

  it("should sort by newest first", () => {
    const result = sortActivities(items, "newest");

    expect(result[0].uid).toBe("2");
    expect(result[1].uid).toBe("3");
    expect(result[2].uid).toBe("1");
  });

  it("should sort by oldest first", () => {
    const result = sortActivities(items, "oldest");

    expect(result[0].uid).toBe("1");
    expect(result[1].uid).toBe("3");
    expect(result[2].uid).toBe("2");
  });

  it("should not mutate original array", () => {
    const original = [...items];
    sortActivities(items, "newest");

    expect(items).toEqual(original);
  });
});

// =============================================================================
// getActivityFilterType Tests
// =============================================================================

describe("getActivityFilterType", () => {
  it("should return funding for grant type", () => {
    const milestone = { ...mockMilestone, type: "grant" as const };
    expect(getActivityFilterType(milestone)).toBe("funding");
  });

  it("should return funding for grant_update type", () => {
    const milestone = { ...mockMilestone, type: "grant_update" as const };
    expect(getActivityFilterType(milestone)).toBe("funding");
  });

  it("should return funding for grant_received type", () => {
    const milestone = { ...mockMilestone, type: "grant_received" as const };
    expect(getActivityFilterType(milestone)).toBe("funding");
  });

  it("should return updates for milestone type", () => {
    const milestone = { ...mockMilestone, type: "milestone" as const };
    expect(getActivityFilterType(milestone)).toBe("updates");
  });

  it("should return updates for activity type", () => {
    const milestone = { ...mockMilestone, type: "activity" as const };
    expect(getActivityFilterType(milestone)).toBe("updates");
  });

  it("should return other for impact type", () => {
    const milestone = { ...mockMilestone, type: "impact" as const };
    expect(getActivityFilterType(milestone)).toBe("other");
  });
});

// =============================================================================
// filterActivities Tests
// =============================================================================

describe("filterActivities", () => {
  const items: UnifiedMilestone[] = [
    { ...mockMilestone, uid: "1", type: "grant" },
    { ...mockMilestone, uid: "2", type: "milestone" },
    { ...mockMilestone, uid: "3", type: "impact" },
  ];

  it("should return all items when no filters active", () => {
    const result = filterActivities(items, []);
    expect(result).toHaveLength(3);
  });

  it("should filter by single type", () => {
    const result = filterActivities(items, ["funding"]);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("grant");
  });

  it("should filter by multiple types", () => {
    const result = filterActivities(items, ["funding", "updates"]);

    expect(result).toHaveLength(2);
  });
});

// =============================================================================
// processActivities Tests
// =============================================================================

describe("processActivities", () => {
  const items: UnifiedMilestone[] = [
    { ...mockMilestone, uid: "1", type: "grant", createdAt: "2024-01-01T10:00:00Z" },
    { ...mockMilestone, uid: "2", type: "milestone", createdAt: "2024-01-15T10:00:00Z" },
    { ...mockMilestone, uid: "3", type: "impact", createdAt: "2024-01-10T10:00:00Z" },
  ];

  it("should apply both filtering and sorting", () => {
    const result = processActivities(items, "newest", ["funding", "updates"]);

    expect(result).toHaveLength(2);
    expect(result[0].uid).toBe("2");
    expect(result[1].uid).toBe("1");
  });

  it("should handle empty filters with sorting", () => {
    const result = processActivities(items, "oldest", []);

    expect(result).toHaveLength(3);
    expect(result[0].uid).toBe("1");
  });
});
