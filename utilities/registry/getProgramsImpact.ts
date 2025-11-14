import type { CategoriesOptions } from "@/components/Pages/Admin/EditCategoriesPage"
import { errorManager } from "@/components/Utilities/errorManager"
import type { ProgramImpactData, ProgramImpactDataResponse } from "@/types/programs"
import fetchData from "../fetchData"
import { INDEXER } from "../indexer"
import { getCommunityDetailsV2 } from "../queries/getCommunityDataV2"

export async function getProgramsImpact(
  communityId: string,
  allCategories?: CategoriesOptions[],
  _programSelected?: string | null,
  _projectSelected?: string | null
): Promise<ProgramImpactData> {
  try {
    // First get the community details to obtain the UID
    const communityDetails = await getCommunityDetailsV2(communityId)

    if (!communityDetails) {
      return {
        data: [],
        stats: {
          totalCategories: 0,
          totalProjects: 0,
          totalFundingAllocated: "0",
        },
      }
    }

    // Use the new V2 impact-segments endpoint with community UID
    const [data, error] = await fetchData(
      INDEXER.COMMUNITY.V2.IMPACT_SEGMENTS(communityDetails.uid)
    )
    if (error) {
      throw error
    }

    // Transform the new API response to match the expected ProgramImpactData structure
    const impactSegments = data || []

    // Group impact segments by categoryName (using the actual category names from API)
    const groupedByCategory = impactSegments.reduce((acc: any, segment: any) => {
      const categoryName = segment.categoryName || "Unknown Category"
      if (!acc[categoryName]) {
        acc[categoryName] = {
          categoryName: categoryName,
          impacts: [],
        }
      }

      acc[categoryName].impacts.push({
        categoryName: categoryName,
        impactSegmentName: segment.name,
        impactSegmentId: segment.id,
        impactSegmentDescription: segment.description,
        impactSegmentType: segment.type, // "output" or "outcome"
        impactIndicatorIds: segment.impactIndicatorIds || [], // Current structure
        indicators: [], // Empty array for backward compatibility
      })

      return acc
    }, {})

    const transformedData: ProgramImpactDataResponse[] = Object.values(groupedByCategory)

    const impactData: ProgramImpactData = {
      stats: {
        totalCategories: Object.keys(groupedByCategory).length,
        totalProjects: 0, // Can't determine from current API
        totalFundingAllocated: "0", // Can't determine from current API
      },
      data: transformedData,
    }

    // If allCategories is provided, ensure all categories are included
    if (allCategories?.length) {
      const existingCategoryNames = new Set(impactData.data.map((item) => item.categoryName))

      // Add missing categories with empty impacts array
      const missingCategories = allCategories
        .filter((category) => !existingCategoryNames.has(category.name))
        .map((category) => ({
          categoryName: category.name,
          impacts: [],
        }))

      return {
        data: [...impactData.data, ...missingCategories],
        stats: impactData.stats,
      }
    }

    return {
      data: impactData.data,
      stats: impactData.stats,
    }
  } catch (error) {
    console.error("Error fetching program impact:", error)
    errorManager("Error fetching program impact", error)
    return {
      data: [],
      stats: {
        totalCategories: 0,
        totalProjects: 0,
        totalFundingAllocated: "0",
      },
    }
  }
}
