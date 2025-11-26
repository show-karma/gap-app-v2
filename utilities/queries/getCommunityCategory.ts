import type { CategoriesOptions } from "@/components/Pages/Admin/EditCategoriesPage";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

export const getCommunityCategory = async (communityId: string) => {
  try {
    const [data, error] = await fetchData(INDEXER.COMMUNITY.CATEGORIES(communityId));
    if (error) {
      throw error;
    }
    const orderedCategories = data.sort((a: CategoriesOptions, b: CategoriesOptions) => {
      return a.name.localeCompare(b.name, "en");
    });
    return orderedCategories as CategoriesOptions[];
  } catch (error) {
    console.error(error);
    errorManager("Error fetching community category", error);
    return [];
  }
};
