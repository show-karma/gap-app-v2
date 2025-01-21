import { errorManager } from "@/components/Utilities/errorManager";
import { ImpactAggregateData } from "@/types/programs";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

export async function getAllProgramsImpactAggregate(communityId: string) {
  try {
    const [data, error] = await fetchData(
      INDEXER.COMMUNITY.ALL_PROGRAMS_IMPACT_AGGREGATE(communityId)
    );
    if (error) {
      throw error;
    }

    let existingCategories = (data as ImpactAggregateData[]).map((item) => {
      return {
        categoryName: item.categoryName,
        outputs: item.outputs || [],
      };
    }) as ImpactAggregateData[];

    return {
      data: existingCategories,
    };
  } catch (error) {
    errorManager("Error fetching program impact", error);
    return {
      data: [],
    };
  }
}
