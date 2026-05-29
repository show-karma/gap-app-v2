/**
 * Tests for community milestone validity filtering.
 *
 * The cards view and the table view of the community Updates page consume the
 * same API payload. Both must drop invalid milestones (missing uid, status,
 * title, or project slug) so the two views render the exact same set of items.
 * `isValidMilestone` is the shared predicate that guarantees that parity.
 * Sort order is handled server-side in gap-indexer.
 */

import type { CommunityMilestoneUpdate } from "@/types/community-updates";
import { isValidMilestone } from "@/utilities/sorting/communityMilestoneSort";

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
    ["whitespace-only uid", { uid: "   " }],
    ["non-string uid", { uid: 123 as unknown as string }],
    ["missing status", { status: undefined as unknown as "pending" }],
    ["unsupported status value", { status: "in_progress" as unknown as "pending" }],
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

  it("rejects a milestone whose title is whitespace only", () => {
    const milestone = createMilestone();
    milestone.details = { ...milestone.details, title: "   " };
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
