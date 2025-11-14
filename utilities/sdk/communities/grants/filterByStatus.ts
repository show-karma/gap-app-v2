import type { Grant } from "@show-karma/karma-gap-sdk"
import type { StatusOptions } from "@/types/filters"
import { filterGrantsByCompleted } from "./filter/filterGrantsByCompleted"
import { filterGrantsByStarting } from "./filter/filterGrantsByStarting"
import { filterGrantsByToBeCompleted } from "./filter/filterGrantsByToBeCompleted"

export const filterByStatus = (option: StatusOptions, grantToFilter: Grant[]) => {
  if (option === "completed") {
    return filterGrantsByCompleted(grantToFilter)
  }
  if (option === "starting") {
    return filterGrantsByStarting(grantToFilter)
  }
  if (option === "to-complete") {
    return filterGrantsByToBeCompleted(grantToFilter)
  }
  return grantToFilter
}
