import type { CommunityProject } from "@/types/v2/community";
import { projectToGrant } from "@/utilities/adapters/v2/projectToGrant";

const baseProject: CommunityProject = {
  uid: "project-uid",
  details: {
    title: "Test Project",
    description: "",
    logoUrl: "",
    slug: "test-project",
  },
  grantNames: ["Grant"],
  funding: [],
  categories: [],
  regions: [],
  members: [],
  links: [],
  endorsements: [],
  contractAddresses: [],
  numMilestones: 0,
  numCompletedMilestones: 0,
  numUpdates: 0,
  percentCompleted: 0,
  numTransactions: 0,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("projectToGrant", () => {
  it("should_mark_first_n_milestones_as_completed_when_numCompletedMilestones_is_set", () => {
    const grant = projectToGrant({
      ...baseProject,
      numMilestones: 7,
      numCompletedMilestones: 4,
      percentCompleted: 57,
    });

    const completedCount = grant.milestones.filter((m) => m.completed).length;
    expect(grant.milestones).toHaveLength(7);
    expect(completedCount).toBe(4);
  });

  it("should_not_lose_count_when_ratio_rounds_to_imprecise_percent", () => {
    // Regression: 4/7 = 57.14% which previously round-tripped through
    // Math.floor(percentCompleted/100 * total) and yielded 3.
    const grant = projectToGrant({
      ...baseProject,
      numMilestones: 7,
      numCompletedMilestones: 4,
      percentCompleted: 57,
    });

    expect(grant.milestones.filter((m) => m.completed).length).toBe(4);
  });

  it("should_return_zero_completed_when_numCompletedMilestones_is_zero", () => {
    const grant = projectToGrant({
      ...baseProject,
      numMilestones: 5,
      numCompletedMilestones: 0,
      percentCompleted: 0,
    });

    expect(grant.milestones.filter((m) => m.completed).length).toBe(0);
  });

  it("should_return_all_completed_when_numCompletedMilestones_equals_total", () => {
    const grant = projectToGrant({
      ...baseProject,
      numMilestones: 3,
      numCompletedMilestones: 3,
      percentCompleted: 100,
    });

    expect(grant.milestones.filter((m) => m.completed).length).toBe(3);
  });

  it("should_return_empty_milestones_when_numMilestones_is_zero", () => {
    const grant = projectToGrant({
      ...baseProject,
      numMilestones: 0,
      numCompletedMilestones: 0,
      percentCompleted: 0,
    });

    expect(grant.milestones).toHaveLength(0);
  });
});
