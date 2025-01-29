import { CategoriesOptions } from "@/components/Pages/Admin/EditCategoriesPage";
import { errorManager } from "@/components/Utilities/errorManager";
import { ProgramImpactData } from "@/types/programs";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

export async function getProgramsImpact(
  communityId: string,
  allCategories?: CategoriesOptions[],
  programSelected?: string | null,
  projectSelected?: string | null
) {
  try {
    const [data, error] = await fetchData(
      `${INDEXER.COMMUNITY.ALL_PROGRAMS_IMPACT(communityId)}?${
        programSelected ? `programId=${programSelected}` : ""
      }${projectSelected ? `&projectUID=${projectSelected}` : ""}`
    );
    if (error) {
      throw error;
    }

    return {
      data: (data as ProgramImpactData).data,
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
