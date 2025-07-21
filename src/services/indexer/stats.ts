import { INDEXER } from "@/services/indexer";
import errorManager from "@/lib/utils/error-manager";
import { StatsResponse } from "@/features/stats/types";
import { fetchData } from "@/lib/utils/fetch-data";

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
