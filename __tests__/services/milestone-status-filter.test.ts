import {
  filterByMilestoneStatus,
  getMilestoneStatus,
  isMilestoneStatusFilter,
  MILESTONE_STATUS_OPTIONS,
  type MilestoneStatusFilter,
} from "@/services/milestone-status-filter.service";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

// Helper to create a minimal UnifiedMilestone for testing
function createMilestone(
  overrides: Partial<UnifiedMilestone> & { type: UnifiedMilestone["type"] }
): UnifiedMilestone {
  return {
    uid: "test-uid",
    type: overrides.type,
    title: "Test Milestone",
    completed: false,
    createdAt: new Date().toISOString(),
    chainID: 1,
    refUID: "ref-uid",
    source: {},
    ...overrides,
  };
}

describe("getMilestoneStatus", () => {
  it("returns 'pending' for a milestone that is not completed", () => {
    const milestone = createMilestone({ type: "milestone", completed: false });
    expect(getMilestoneStatus(milestone)).toBe("pending");
  });

  it("returns 'completed' for a milestone with completed as object (no verification)", () => {
    const milestone = createMilestone({
      type: "grant",
      completed: {
        createdAt: "2024-01-01",
        data: { reason: "Done" },
      },
      source: {
        grantMilestone: {
          milestone: {
            uid: "m1",
            chainID: 1,
            title: "Test",
            verified: [],
          },
          grant: { uid: "g1", chainID: 1 },
        },
      },
    });
    expect(getMilestoneStatus(milestone)).toBe("completed");
  });

  it("returns 'completed' for a milestone with completed=true (boolean)", () => {
    const milestone = createMilestone({
      type: "milestone",
      completed: true as any,
      source: {
        projectMilestone: {
          uid: "pm1",
          verified: false,
        },
      },
    });
    expect(getMilestoneStatus(milestone)).toBe("completed");
  });

  it("returns 'verified' for a grant milestone with verification entries", () => {
    const milestone = createMilestone({
      type: "grant",
      completed: {
        createdAt: "2024-01-01",
        data: { reason: "Done" },
      },
      source: {
        grantMilestone: {
          milestone: {
            uid: "m1",
            chainID: 1,
            title: "Test",
            verified: [
              {
                uid: "v1",
                attester: "0xverifier",
                createdAt: "2024-01-02",
              },
            ],
          },
          grant: { uid: "g1", chainID: 1 },
        },
      },
    });
    expect(getMilestoneStatus(milestone)).toBe("verified");
  });

  it("returns 'verified' for a project milestone with verified=true", () => {
    const milestone = createMilestone({
      type: "milestone",
      completed: {
        createdAt: "2024-01-01",
        data: { reason: "Done" },
      },
      source: {
        projectMilestone: {
          uid: "pm1",
          verified: true,
        },
      },
    });
    expect(getMilestoneStatus(milestone)).toBe("verified");
  });

  it("returns null for non-milestone types (e.g., grant_update)", () => {
    const item = createMilestone({ type: "grant_update" });
    expect(getMilestoneStatus(item)).toBeNull();
  });

  it("returns null for endorsement type", () => {
    const item = createMilestone({ type: "endorsement" });
    expect(getMilestoneStatus(item)).toBeNull();
  });

  it("returns null for grant_received type", () => {
    const item = createMilestone({ type: "grant_received" });
    expect(getMilestoneStatus(item)).toBeNull();
  });

  it("returns a non-null status for impact type (impact is a milestone type)", () => {
    const item = createMilestone({
      type: "impact",
      completed: false,
      source: { type: "impact" },
    });
    expect(getMilestoneStatus(item)).not.toBeNull();
  });

  it("returns 'pending' for an impact item with completed=false", () => {
    const item = createMilestone({
      type: "impact",
      completed: false,
      source: { type: "impact" },
    });
    expect(getMilestoneStatus(item)).toBe("pending");
  });

  it("returns 'completed' for an impact item with completed as object", () => {
    const item = createMilestone({
      type: "impact",
      completed: {
        createdAt: "2024-01-01",
        data: { reason: "Impact done" },
      },
      source: { type: "impact" },
    });
    expect(getMilestoneStatus(item)).toBe("completed");
  });
});

describe("filterByMilestoneStatus", () => {
  const pendingMilestone = createMilestone({
    uid: "pending-1",
    type: "milestone",
    completed: false,
  });

  const completedMilestone = createMilestone({
    uid: "completed-1",
    type: "grant",
    completed: {
      createdAt: "2024-01-01",
      data: { reason: "Done" },
    },
    source: {
      grantMilestone: {
        milestone: {
          uid: "m1",
          chainID: 1,
          title: "Completed MS",
          verified: [],
        },
        grant: { uid: "g1", chainID: 1 },
      },
    },
  });

  const verifiedMilestone = createMilestone({
    uid: "verified-1",
    type: "grant",
    completed: {
      createdAt: "2024-01-01",
      data: { reason: "Done" },
    },
    source: {
      grantMilestone: {
        milestone: {
          uid: "m2",
          chainID: 1,
          title: "Verified MS",
          verified: [
            {
              uid: "v1",
              attester: "0xverifier",
              createdAt: "2024-01-02",
            },
          ],
        },
        grant: { uid: "g1", chainID: 1 },
      },
    },
  });

  const updateItem = createMilestone({
    uid: "update-1",
    type: "grant_update",
  });

  const allItems = [pendingMilestone, completedMilestone, verifiedMilestone, updateItem];

  it("returns all items when status is 'all'", () => {
    const result = filterByMilestoneStatus(allItems, "all");
    expect(result).toHaveLength(4);
  });

  it("returns only pending milestones and non-milestone items when status is 'pending'", () => {
    const result = filterByMilestoneStatus(allItems, "pending");
    // Pending milestones are kept, non-milestone items are kept (they aren't filtered out)
    expect(result).toContainEqual(expect.objectContaining({ uid: "pending-1" }));
    expect(result).toContainEqual(expect.objectContaining({ uid: "update-1" }));
    expect(result).not.toContainEqual(expect.objectContaining({ uid: "completed-1" }));
    expect(result).not.toContainEqual(expect.objectContaining({ uid: "verified-1" }));
  });

  it("returns only completed milestones and non-milestone items when status is 'completed'", () => {
    const result = filterByMilestoneStatus(allItems, "completed");
    expect(result).toContainEqual(expect.objectContaining({ uid: "completed-1" }));
    expect(result).toContainEqual(expect.objectContaining({ uid: "update-1" }));
    expect(result).not.toContainEqual(expect.objectContaining({ uid: "pending-1" }));
    expect(result).not.toContainEqual(expect.objectContaining({ uid: "verified-1" }));
  });

  it("returns only verified milestones and non-milestone items when status is 'verified'", () => {
    const result = filterByMilestoneStatus(allItems, "verified");
    expect(result).toContainEqual(expect.objectContaining({ uid: "verified-1" }));
    expect(result).toContainEqual(expect.objectContaining({ uid: "update-1" }));
    expect(result).not.toContainEqual(expect.objectContaining({ uid: "pending-1" }));
    expect(result).not.toContainEqual(expect.objectContaining({ uid: "completed-1" }));
  });

  it("handles empty array", () => {
    const result = filterByMilestoneStatus([], "completed");
    expect(result).toHaveLength(0);
  });

  it("returns only milestone-type items when filtering by status and combined with milestones-only feed", () => {
    // When the milestones filter is active, the feed only has milestone items
    const milestonesOnly = [pendingMilestone, completedMilestone, verifiedMilestone];
    const result = filterByMilestoneStatus(milestonesOnly, "pending");
    expect(result).toHaveLength(1);
    expect(result[0].uid).toBe("pending-1");
  });
});

describe("isMilestoneStatusFilter", () => {
  it.each(["all", "pending", "completed", "verified"])("returns true for %s", (value) => {
    expect(isMilestoneStatusFilter(value)).toBe(true);
  });

  it.each([null, "", "ALL", "done", "unknown", "Pending"])(
    "returns false for invalid value %s",
    (value) => {
      expect(isMilestoneStatusFilter(value as string | null)).toBe(false);
    }
  );
});

describe("MILESTONE_STATUS_OPTIONS", () => {
  it("has 'all' as the first option", () => {
    expect(MILESTONE_STATUS_OPTIONS[0].value).toBe("all");
  });

  it("includes all expected status options", () => {
    const values = MILESTONE_STATUS_OPTIONS.map((o) => o.value);
    expect(values).toEqual(["all", "pending", "completed", "verified"]);
  });

  it("each option has a label", () => {
    for (const option of MILESTONE_STATUS_OPTIONS) {
      expect(option.label).toBeTruthy();
    }
  });
});
