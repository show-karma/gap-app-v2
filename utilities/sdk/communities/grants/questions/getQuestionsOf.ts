import axios from "axios";

import { INDEXER } from "@/utilities/indexer";

export const getQuestionsOf = async (grantUID: string | `0x${string}`) => {
  try {
    const { data } = await axios.get(
      INDEXER.GRANTS.REVIEWS.QUESTIONS(grantUID)
    );
    if (data.length) {
      return data;
    }

    return [];
  } catch (error) {
    console.log(error);
    return [];
  }
};
