import axios from "axios";

import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";

export const getQuestionsOf = async (grantUID: string | `0x${string}`) => {
  try {
    const [data] = await fetchData(INDEXER.GRANTS.REVIEWS.QUESTIONS(grantUID));
    if (data.length) {
      return data;
    }

    return [];
  } catch (error) {
    console.log(error);
    return [];
  }
};
