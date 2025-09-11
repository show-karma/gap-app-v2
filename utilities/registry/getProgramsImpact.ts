import { CategoriesOptions } from "@/components/Pages/Admin/EditCategoriesPage";
import { errorManager } from "@/components/Utilities/errorManager";
import { ProgramImpactData, ProgramImpactDataResponse } from "@/types/programs";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";
import { getCommunityDetailsV2 } from "../queries/getCommunityDataV2";

export async function getProgramsImpact(
  communityId: string,
  allCategories?: CategoriesOptions[],
  programSelected?: string | null,
  projectSelected?: string | null
): Promise<ProgramImpactData> {
  try {
    // First get the community details to obtain the UID
    const communityDetails = await getCommunityDetailsV2(communityId);
    
    // Use the new V2 impact-segments endpoint with community UID
    const [data, error] = await fetchData(
      INDEXER.COMMUNITY.V2.IMPACT_SEGMENTS(communityDetails.uid)
    );
    if (error) {
      throw error;
    }

    // Transform the new API response to match the expected ProgramImpactData structure
    const impactSegments = data || [];
    
    // Group impact segments by categoryName (using the actual category names from API)
    const groupedByCategory = impactSegments.reduce((acc: any, segment: any) => {
      const categoryName = segment.categoryName || 'Unknown Category';
      if (!acc[categoryName]) {
        acc[categoryName] = {
          categoryName: categoryName,
          impacts: []
        };
      }
      
      // Transform the segment into both old and new formats for compatibility
      const mockIndicators = segment.impactIndicatorIds?.length > 0 ? segment.impactIndicatorIds.map((indicatorId: string, index: number) => ({
        // Mock indicator data structure for backward compatibility
        programId: "mock-program",
        grantUID: "mock-grant-uid",
        grantTitle: `Grant ${index + 1}`,
        amount: "0",
        projectUID: "mock-project-uid", 
        projectTitle: `Project ${index + 1}`,
        projectSlug: "mock-project-slug",
        impactIndicatorId: indicatorId,
        impactSegmentId: segment.id,
        indicatorName: `Indicator ${index + 1}`,
        indicatorDescription: `Description for indicator ${index + 1}`,
        indicatorUnitOfMeasure: "units",
        impactSegmentName: segment.name,
        impactSegmentDescription: segment.description,
        impactSegmentType: segment.type,
        categoryId: segment.categoryName,
        categoryName: categoryName,
        datapoints: [] // Empty datapoints for now
      })) : [];

      acc[categoryName].impacts.push({
        categoryName: categoryName,
        impactSegmentName: segment.name,
        impactSegmentId: segment.id,
        impactSegmentDescription: segment.description,
        impactSegmentType: segment.type, // "output" or "outcome"
        impactIndicatorIds: segment.impactIndicatorIds || [], // New structure for impact page
        indicators: mockIndicators // Old structure for backward compatibility
      });
      
      return acc;
    }, {});

    const transformedData: ProgramImpactDataResponse[] = Object.values(groupedByCategory);

    const impactData: ProgramImpactData = {
      stats: {
        totalCategories: Object.keys(groupedByCategory).length,
        totalProjects: 0, // Can't determine from current API
        totalFundingAllocated: "0", // Can't determine from current API
      },
      data: transformedData
    };

    // If allCategories is provided, ensure all categories are included
    if (allCategories?.length) {
      const existingCategoryNames = new Set(
        impactData.data.map((item) => item.categoryName)
      );

      // Add missing categories with empty impacts array
      const missingCategories = allCategories
        .filter((category) => !existingCategoryNames.has(category.name))
        .map((category) => ({
          categoryName: category.name,
          impacts: [],
        }));

      return {
        data: [...impactData.data, ...missingCategories],
        stats: impactData.stats,
      };
    }

    return {
      data: impactData.data,
      stats: impactData.stats,
    };
  } catch (error) {
    console.error("Error fetching program impact:", error);
    errorManager("Error fetching program impact", error);
    return {
      data: [],
      stats: {
        totalCategories: 0,
        totalProjects: 0,
        totalFundingAllocated: "0",
      },
    };
  }
}
