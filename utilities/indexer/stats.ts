import type { StatsResponse } from "@/types";
import { INDEXER } from "../indexer";
import fetchData from "../fetchData";

export const getGAPStats = async (): Promise<StatsResponse> => {
  try {
    const [data] = await fetchData(INDEXER.GAP.STATS);
    return data;
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getGAPWeeklyActiveUsers = async (): Promise<StatsResponse> => {
  try {
    const [data] = await fetchData(INDEXER.GAP.WEEKLY_ACTIVE_USERS);
    return data;
  } catch (error) {
    console.log(error);
    return [];
  }
};
