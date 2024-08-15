import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { errorManager } from "@/components/Utilities/ErrorManager";

export const getQuestionsOf = async (grantUID: string | `0x${string}`) => {
  try {
    const [data] = await fetchData(INDEXER.GRANTS.REVIEWS.QUESTIONS(grantUID));
    if (data.length) {
      return data;
    }

    return [];
  } catch (error) {
    console.log(error);
    errorManager(`Error getting questions of grant: ${grantUID}`, error);
    return [];
  }
};
