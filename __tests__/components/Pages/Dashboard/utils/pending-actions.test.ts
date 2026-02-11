import { computeProjectPendingActions } from "@/components/Pages/Dashboard/utils/pending-actions";
import type { ProjectWithGrantsResponse } from "@/types/v2/project";

describe("computeProjectPendingActions", () => {
  it("returns all zeros for project with no grants", () => {
    const project = { grants: [] } as ProjectWithGrantsResponse;

    expect(computeProjectPendingActions(project)).toEqual({
      milestonesNeedingSubmission: 0,
      grantsInProgress: 0,
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
});
