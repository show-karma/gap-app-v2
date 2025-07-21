import { CategoriesOptions } from "@/features/admin/components/categories/EditCategoriesPage";
import { errorManager } from "@/lib/utils/error-manager";
import { zeroUID } from "@/lib/utils/misc";
import fetchData from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";
import { useQuery } from "@tanstack/react-query";

const fetchCategories = async (communityId: string) => {
  if (!communityId || communityId === zeroUID) {
    throw new Error("Invalid community ID");
  }

  const [data, error] = await fetchData(
    INDEXER.COMMUNITY.CATEGORIES(communityId)
  );

  if (!data) {
    errorManager(`Error fetching categories of ${communityId}`, error);
  }

  return data.sort((a: CategoriesOptions, b: CategoriesOptions) =>
    a.name.localeCompare(b.name, "en")
  );
};

export const useCategories = (communityId: string) => {
  return useQuery<CategoriesOptions[], Error>({
    queryKey: ["categories", communityId],
    queryFn: () => fetchCategories(communityId),
    enabled: !!communityId && communityId !== zeroUID,
  });
};
