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
// combineUpdatesAndImpacts Tests
// =============================================================================

describe("combineUpdatesAndImpacts", () => {
  it("should combine milestones and impacts", () => {
    const milestones = [mockMilestone];
    const impacts = [mockImpact];

    const result = combineUpdatesAndImpacts(milestones, impacts);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(mockMilestone);
    expect(result[1].type).toBe("impact");
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
  it("should aggregate all data correctly", () => {
    const result = aggregateProjectProfileData(
      mockProject,
      [mockGrant],
      [mockMilestone],
      [mockImpact]
    );

    expect(result.isVerified).toBe(true);
    expect(result.allUpdates).toHaveLength(2);
    expect(result.completedCount).toBe(1);
    expect(result.stats.grantsCount).toBe(1);
    expect(result.stats.endorsementsCount).toBe(2);
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
