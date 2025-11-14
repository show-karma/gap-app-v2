import type { Grant } from "@show-karma/karma-gap-sdk"

export const filterByCategory = (categoriesToFilter: string[], grantToFilter: Grant[]) => {
  if (categoriesToFilter.length === 0) {
    return grantToFilter
  }
  let filteredGrants = [...grantToFilter]
  filteredGrants = filteredGrants.filter((grant) => {
    return categoriesToFilter.some((value) =>
      grant.categories?.map((item) => item.toLowerCase()).includes(value.toLowerCase())
    )
  })
  return filteredGrants
}
