import type { Grant } from "@show-karma/karma-gap-sdk";

export const sortGrantByMilestones = (grants: Grant[]) => {
  const newGrants = [...grants];
  return newGrants.sort((a, b) => {
    const aMilestones = a.milestones?.length ?? 0;
    const bMilestones = b.milestones?.length ?? 0;

    return bMilestones - aMilestones;
  });
};
