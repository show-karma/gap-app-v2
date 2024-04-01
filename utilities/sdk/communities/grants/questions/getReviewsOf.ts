import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const getReviewsOf = async (grantUID: string | `0x${string}`) => {
  try {
    const [data] = await fetchData(INDEXER.GRANTS.REVIEWS.ALL(grantUID));
    return data;
  } catch (error) {
    console.log(error);
    return [];
  }
};
export const getAnonReviewsOf = async (grantUID: string | `0x${string}`) => {
  try {
    const [data] = await fetchData(INDEXER.GRANTS.REVIEWS.ALL_ANON(grantUID));
    return data;
  } catch (error) {
    console.log(error);
    return [];
  }
};
