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
      const onlyWithData = item.outputs.filter(
        (output) => output.datapoints.length > 0
      );
      return {
        categoryName: item.categoryName,
        outputs:
          onlyWithData.map((output: any) => ({
            ...output,
            lastUpdated: output.createdAt || output.updatedAt,
          })) || [],
      };
    }) as ProgramImpactDataResponse[];

    if (projectSelected) {
      existingCategories = existingCategories.map((category) => ({
        ...category,
        outputs: category.outputs.filter(
          (output) =>
            output.projectUID.toLowerCase() === projectSelected?.toLowerCase()
        ),
      }));
    }

    const missingCategories = allCategories.filter(
      (category) =>
        !existingCategories.some((c) => c.categoryName === category.name)
    );

    const missingCategoriesData = missingCategories.map((category) => ({
      categoryName: category.name,
      outputs: [],
    }));

    const allCategoriesData = [...existingCategories, ...missingCategoriesData];
    return {
      data: allCategoriesData,
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
