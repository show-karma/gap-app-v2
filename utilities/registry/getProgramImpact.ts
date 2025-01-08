import { CategoriesOptions } from "@/components/Pages/Admin/EditCategoriesPage";
import { errorManager } from "@/components/Utilities/errorManager";
import { ProgramImpactDataResponse } from "@/types/programs";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

export async function getProgramImpact(
  communityId: string,
  programId: string,
  allCategories: CategoriesOptions[]
) {
  try {
    if (!programId) return;
    const [data, error] = await fetchData(
      INDEXER.COMMUNITY.PROGRAM_IMPACT(communityId, programId)
    );
    if (error) {
      throw error;
    }

    const existingCategories = data.map((item: any) => ({
      categoryName: item.categoryName,
      outputs: item.outputs.map((output: any) => ({
        ...output,
        lastUpdated: output.createdAt || output.updatedAt,
      })),
    })) as ProgramImpactDataResponse[];

    const missingCategories = allCategories.filter(
      (category) =>
        !existingCategories.some((c) => c.categoryName === category.name)
    );

    const missingCategoriesData = missingCategories.map((category) => ({
      categoryName: category.name,
      outputs: [],
    }));

    return [...existingCategories, ...missingCategoriesData];
  } catch (error) {
    errorManager("Error fetching program impact", error);
    return [];
  }
}
