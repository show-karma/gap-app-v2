import type { StatsResponse } from "@/types";
import { INDEXER } from "../indexer";
import fetchData from "../fetchData";
import { errorManager } from "@/components/Utilities/errorManager";

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
