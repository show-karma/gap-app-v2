import { errorManager } from "@/components/Utilities/errorManager";
import type { ImpactAggregateData } from "@/types/programs";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

export async function getAllProgramsImpactAggregate(communityId: string) {
	try {
		const [data, error] = await fetchData(
			INDEXER.COMMUNITY.ALL_PROGRAMS_IMPACT_AGGREGATE(communityId),
		);
		if (error) {
			throw error;
		}

		const existingCategories = (data as ImpactAggregateData[]).map((item) => {
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
