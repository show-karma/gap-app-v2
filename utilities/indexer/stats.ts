import { errorManager } from "@/components/Utilities/errorManager";
import type { StatsResponse } from "@/types";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

export const getGAPStats = async (): Promise<StatsResponse> => {
	try {
		const [data] = await fetchData(INDEXER.GAP.STATS);
		return data;
	} catch (error: any) {
		console.log(error);
		errorManager(`Error fetching GAP stats`, error);
		return [];
	}
};

export const getGAPWeeklyActiveUsers = async (): Promise<StatsResponse> => {
	try {
		const [data] = await fetchData(INDEXER.GAP.WEEKLY_ACTIVE_USERS);
		return data;
	} catch (error: any) {
		console.log(error);
		errorManager(`Error fetching GAP weekly active users`, error);
		return [];
	}
};
