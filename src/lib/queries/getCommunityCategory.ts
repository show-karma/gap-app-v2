import errorManager from "@/lib/utils/error-manager";
import fetchData from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";
import { CategoriesOptions } from "@/features/admin/components/categories/EditCategoriesPage";

export const getCommunityCategory = async (communityId: string) => {
  try {
    const [data, error] = await fetchData(
      INDEXER.COMMUNITY.CATEGORIES(communityId)
    );
    if (error) {
      throw error;
    }
    const orderedCategories = data.sort(
      (a: CategoriesOptions, b: CategoriesOptions) => {
        return a.name.localeCompare(b.name, "en");
      }
    );
    return orderedCategories as CategoriesOptions[];
  } catch (error) {
    console.error(error);
    errorManager("Error fetching community category", error);
    return [];
  }
};
