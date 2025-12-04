import type { Grant } from "@show-karma/karma-gap-sdk";

import type { SortByOptions } from "@/types";

import { sortGrantByCompletePercentage } from "./sort/sortGrantByCompletePercentage";
import { sortGrantByMilestones } from "./sort/sortGrantByMilestones";
import { sortGrantByMostRecent } from "./sort/sortGrantByMostRecent";

export const orderBySortBy = (option: SortByOptions, grantsToChange: Grant[]) => {
  if (option === "completed") {
    const completedGrants = sortGrantByCompletePercentage(grantsToChange);
    return completedGrants;
  }
  if (option === "milestones") {
    const milestoneGrants = sortGrantByMilestones(grantsToChange);
    return milestoneGrants;
  }
  const recentGrants = sortGrantByMostRecent(grantsToChange);
  return recentGrants;
};
