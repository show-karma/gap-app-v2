import errorManager from "@/lib/utils/error-manager";
import { ProgramImpactData } from "@/types/programs";
import fetchData from "@/lib/utils/fetch-data";
import { INDEXER } from "../indexer";
import { CategoriesOptions } from "@/features/admin/components/categories/EditCategoriesPage";

export async function getProgramsImpact(
  communityId: string,
  allCategories?: CategoriesOptions[],
  programSelected?: string | null,
  projectSelected?: string | null
) {
  try {
    const [data, error] = await fetchData(
      `${INDEXER.COMMUNITY.PROGRAMS_IMPACT(communityId)}?${
        programSelected
          ? `programId=${programSelected.split("_")[0]}&programChainId=${
              programSelected.split("_")[1]
            }`
          : ""
      }${projectSelected ? `&projectUID=${projectSelected}` : ""}`
    );
    if (error) {
      throw error;
    }

    const impactData = data as ProgramImpactData;

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
