import { Grant } from "@show-karma/karma-gap-sdk/core/class/entities/Grant";

export const filterGrantsByStarting = (grants: Grant[]) => {
  const newGrants = [...grants];
  // filter by grants that doesn't have any milestones completed
  return newGrants.filter((grant) => {
    const { milestones } = grant;
    const completedMilestones = milestones.filter(
      (milestone) =>
        milestone.completed || milestone.approved || milestone.rejected
    );
    return completedMilestones.length === 0;
  });
};
