import type { Grant } from '@show-karma/karma-gap-sdk';

export const sortGrantByCompletePercentage = (grants: Grant[]) => {
  const newGrants = [...grants];
  return newGrants.sort((a, b) => {
    // should sort by percentage of milestones completed
    const aMilestones = a.milestones?.length || 0;
    const bMilestones = b.milestones?.length || 0;
    const aMilestonesCompleted =
      a.milestones?.filter((milestone) => milestone.completed).length || 0;
    const bMilestonesCompleted =
      b.milestones?.filter((milestone) => milestone.completed).length || 0;
    const aPercentage = aMilestones ? aMilestonesCompleted / aMilestones : 0;
    const bPercentage = bMilestones ? bMilestonesCompleted / bMilestones : 0;

    return bPercentage - aPercentage;
  });
};
