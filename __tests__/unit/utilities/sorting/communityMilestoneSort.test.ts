/**
 * Tests for community milestone validity filtering and sorting.
 *
 * The cards view and the table view of the community Updates page consume the
 * same API payload. Both must drop invalid milestones (missing uid, status,
 * title, or project slug) so the two views render the exact same set of items.
 * `isValidMilestone` is the shared predicate that guarantees that parity.
 */

import type { CommunityMilestoneUpdate } from "@/types/community-updates";
import {
  isValidMilestone,
  sortCommunityMilestones,
} from "@/utilities/sorting/communityMilestoneSort";

function createMilestone(
  overrides: Partial<CommunityMilestoneUpdate> = {}
): CommunityMilestoneUpdate {
  return {
    uid: "milestone-1",
    communityUID: "community-1",
    status: "pending",
    details: {
      title: "Milestone title",
      description: "Description",
      dueDate: "2026-01-01T00:00:00.000Z",
    },
    project: {
      uid: "project-1",
      details: {
        data: {
          title: "Project title",
          slug: "project-slug",
        },
      },
    },
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("isValidMilestone", () => {
  it("accepts a fully populated milestone", () => {
    expect(isValidMilestone(createMilestone())).toBe(true);
  });

  it.each([
    ["missing uid", { uid: "" }],
    ["missing status", { status: undefined as unknown as "pending" }],
  ])("rejects a milestone %s", (_label, overrides) => {
    expect(isValidMilestone(createMilestone(overrides as Partial<CommunityMilestoneUpdate>))).toBe(
      false
    );
  });

  it("rejects a milestone with no details title", () => {
    const milestone = createMilestone();
    milestone.details = { ...milestone.details, title: "" };
    expect(isValidMilestone(milestone)).toBe(false);
  });

  it("rejects a milestone whose project has no slug", () => {
    const milestone = createMilestone();
    milestone.project = {
      ...milestone.project,
      details: { data: { title: "Project title", slug: "" } },
    };
    expect(isValidMilestone(milestone)).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(isValidMilestone(null)).toBe(false);
    expect(isValidMilestone(undefined)).toBe(false);
    expect(isValidMilestone("milestone")).toBe(false);
  });
});

describe("sortCommunityMilestones", () => {
  it("filters out invalid milestones from the result", () => {
    const valid = createMilestone({ uid: "valid" });
    const invalid = createMilestone({ uid: "" });

    const result = sortCommunityMilestones([valid, invalid], "all", "community-1");

    expect(result).toHaveLength(1);
    expect(result[0].uid).toBe("valid");
  });

  it("orders pending milestones before completed ones for the 'all' filter", () => {
    const completed = createMilestone({ uid: "completed", status: "completed" });
    const pending = createMilestone({ uid: "pending", status: "pending" });

    const result = sortCommunityMilestones([completed, pending], "all", "community-1");

    expect(result.map((m) => m.uid)).toEqual(["pending", "completed"]);
  });

  it("returns an empty array for non-array input", () => {
    expect(
      sortCommunityMilestones(
        undefined as unknown as CommunityMilestoneUpdate[],
        "all",
        "community-1"
      )
    ).toEqual([]);
  });
});
