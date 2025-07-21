import errorManager from "@/lib/utils/error-manager";
import { gapIndexerApi } from "@/services/gap-indexer/gap-indexer";

export const getCommunityBySlug = async (slug: string) => {
  try {
    const { data } = await gapIndexerApi.communityBySlug(slug);
    return data;
  } catch (error) {
    errorManager("Error getting community by slug", error);
    return null;
  }
};
