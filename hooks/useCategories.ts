import { useQuery } from "@tanstack/react-query";
import type { CategoriesOptions } from "@/components/Pages/Admin/EditCategoriesPage";
import { errorManager } from "@/components/Utilities/errorManager";
import { zeroUID } from "@/utilities/commons";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

const fetchCategories = async (communityId: string) => {
  if (!communityId || communityId === zeroUID) {
    throw new Error("Invalid community ID");
  }

  const [data, error] = await fetchData(INDEXER.COMMUNITY.CATEGORIES(communityId));

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
