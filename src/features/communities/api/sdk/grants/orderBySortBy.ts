import type { Grant } from "@show-karma/karma-gap-sdk";

import { sortGrantByCompletePercentage } from "./sort/sortGrantByCompletePercentage";
import { sortGrantByMilestones } from "./sort/sortGrantByMilestones";
import { sortGrantByMostRecent } from "./sort/sortGrantByMostRecent";
import { SortByOptions } from "@/types/filters";

export const orderBySortBy = (
  option: SortByOptions,
  grantsToChange: Grant[]
) => {
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
