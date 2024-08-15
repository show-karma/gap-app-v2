import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const getReviewsOf = async (grantUID: string | `0x${string}`) => {
  try {
    const [data] = await fetchData(INDEXER.GRANTS.REVIEWS.ALL(grantUID));
    return data;
  } catch (error: any) {
    console.log(error);
    errorManager(`Error getting reviews of grant: ${grantUID}`, error);
    return [];
  }
};
export const getAnonReviewsOf = async (grantUID: string | `0x${string}`) => {
  try {
    const [data] = await fetchData(INDEXER.GRANTS.REVIEWS.ALL_ANON(grantUID));
    return data;
  } catch (error: any) {
    console.log(error);
    errorManager(`Error getting anon reviews of grant: ${grantUID}`, error);
    return [];
  }
};
