import { errorManager } from "@/components/Utilities/errorManager";
import type { ImpactAggregateData } from "@/types/programs";
import { api } from "../api/client";
import { INDEXER } from "../indexer";

export async function getAllProgramsImpactAggregate(communityId: string) {
  try {
    // TODO(#1775): add zod schema — ImpactAggregateData is a deeply nested
    // shape (segments/indicators/datapoints) not safe to re-derive strictly here.
    const data = await api.get<ImpactAggregateData[]>(
      INDEXER.COMMUNITY.ALL_PROGRAMS_IMPACT_AGGREGATE(communityId)
    );

    const existingCategories = data.map((item) => {
      return {
        categoryName: item.categoryName,
        impacts: item.impacts || [],
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
