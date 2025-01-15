import { CategoriesOptions } from "@/components/Pages/Admin/EditCategoriesPage";
import { errorManager } from "@/components/Utilities/errorManager";
import { ProgramImpactData, ProgramImpactDataResponse } from "@/types/programs";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

export async function getAllProgramsImpact(
  communityId: string,
  allCategories: CategoriesOptions[],
  projectSelected?: string | null
) {
  try {
    const [data, error] = await fetchData(
      INDEXER.COMMUNITY.ALL_PROGRAMS_IMPACT(communityId)
    );
    if (error) {
      throw error;
    }

    let existingCategories = (data as ProgramImpactData).data.map((item) => {
      return {
        categoryName: item.categoryName,
        outputs:
          item.outputs.map((output: any) => ({
            ...output,
            lastUpdated: output.createdAt || output.updatedAt,
          })) || [],
      };
    }) as ProgramImpactDataResponse[];

    if (projectSelected) {
      existingCategories = existingCategories
        .map((category) => ({
          ...category,
          outputs: category.outputs.filter(
            (output) =>
              output.projectUID.toLowerCase() === projectSelected?.toLowerCase()
          ),
        }))
        .filter((item) => item.outputs.length);
    }

    return {
      data: existingCategories,
      stats: (data as ProgramImpactData).stats,
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
