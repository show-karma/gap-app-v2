import {
  computeProjectPendingActions,
  projectPendingHref,
} from "@/components/Pages/Dashboard/utils/pending-actions";
import type { ProjectWithGrantsResponse } from "@/types/v2/project";

describe("computeProjectPendingActions", () => {
  it("returns all zeros for project with no grants", () => {
    const project = { grants: [] } as ProjectWithGrantsResponse;

    expect(computeProjectPendingActions(project)).toEqual({
      milestonesNeedingSubmission: 0,
      grantsInProgress: 0,
      grantsWithPendingMilestones: [],
      inProgressGrantUids: [],
    });
  });

  it("counts milestones needing submission correctly", () => {
    const project = {
      grants: [
        {
          completed: null,
          milestones: [
            { completed: null, verified: [] },
            { completed: null, verified: [] },
          ],
        },
      ],
    } as ProjectWithGrantsResponse;

    const result = computeProjectPendingActions(project);

    expect(result.milestonesNeedingSubmission).toBe(2);
    expect(result.grantsInProgress).toBe(1);
  });

  it("counts grants in progress correctly", () => {
    const project = {
      grants: [
        { completed: null, milestones: [] },
        { completed: null, milestones: [] },
        { completed: { uid: "grant" }, milestones: [] },
      ],
    } as ProjectWithGrantsResponse;

    const result = computeProjectPendingActions(project);

    expect(result.grantsInProgress).toBe(2);
  });

  it("handles undefined milestones and grants arrays", () => {
    const project = {
      grants: [{ completed: null }],
    } as ProjectWithGrantsResponse;

    const result = computeProjectPendingActions(project);

    expect(result.milestonesNeedingSubmission).toBe(0);
    expect(result.grantsInProgress).toBe(1);
  });

  it("does not count incomplete milestones from completed grants", () => {
    const project = {
      grants: [
        {
          completed: { uid: "grant" },
          milestones: [{ completed: null, verified: [] }],
        },
      ],
    } as ProjectWithGrantsResponse;

    const result = computeProjectPendingActions(project);

    expect(result.milestonesNeedingSubmission).toBe(0);
    expect(result.grantsInProgress).toBe(0);
  });
});

describe("projectPendingHref", () => {
  const hrefFor = (grants: unknown) =>
    projectPendingHref(
      "proj",
      computeProjectPendingActions({ grants } as ProjectWithGrantsResponse)
    );

  it("deep-links to the single grant when the pending milestones live in one grant", () => {
    expect(hrefFor([{ uid: "0xabc", completed: null, milestones: [{ completed: null }] }])).toBe(
      "/project/proj/funding/0xabc"
    );
  });

  it("links to the funding tab when pending milestones span multiple grants", () => {
    expect(
      hrefFor([
        { uid: "0xa", completed: null, milestones: [{ completed: null }] },
        { uid: "0xb", completed: null, milestones: [{ completed: null }] },
      ])
    ).toBe("/project/proj/funding");
  });

  it("deep-links to the single in-progress grant when no milestones are pending", () => {
    expect(hrefFor([{ uid: "0xonly", completed: null, milestones: [] }])).toBe(
      "/project/proj/funding/0xonly"
    );
  });

  it("falls back to the funding tab when the single grant has no uid", () => {
    expect(hrefFor([{ completed: null, milestones: [{ completed: null }] }])).toBe(
      "/project/proj/funding"
    );
  });

  it("links to the project overview when there is no pending work", () => {
    expect(hrefFor([{ uid: "0xdone", completed: { uid: "c" }, milestones: [] }])).toBe(
      "/project/proj"
    );
  });
});
