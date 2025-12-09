import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const getCommunityBySlug = async (slug: string) => {
  try {
    const [data, error] = await fetchData(INDEXER.COMMUNITY.V2.GET(slug));
    if (error || !data) return null;
    return data;
  } catch (error) {
    errorManager("Error getting community by slug", error);
    return null;
  }
};
