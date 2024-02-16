import { INDEXER } from "@/utilities/indexer";
import axios from "axios";

export const getReviewsOf = async (grantUID: string | `0x${string}`) => {
  try {
    const { data } = await axios.get(INDEXER.GRANTS.REVIEWS.ALL(grantUID));
    return data;
  } catch (error) {
    console.log(error);
    return [];
  }
};
