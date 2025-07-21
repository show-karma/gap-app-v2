import type { Grant } from '@show-karma/karma-gap-sdk';

export const filterGrantsByToBeCompleted = (grants: Grant[]) => {
  const newGrants = [...grants];
  return newGrants.filter((grant) => {
    const { milestones } = grant;
    const completedMilestones = milestones.filter(
      (milestone) => milestone.completed
    );

    return milestones.length !== completedMilestones.length;
  });
};
