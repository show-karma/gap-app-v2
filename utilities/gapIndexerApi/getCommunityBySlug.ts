import { errorManager } from "@/components/Utilities/errorManager"
import { gapIndexerApi } from "."

export const getCommunityBySlug = async (slug: string) => {
  try {
    const { data } = await gapIndexerApi.communityBySlug(slug)
    return data
  } catch (error) {
    errorManager("Error getting community by slug", error)
    return null
  }
}
