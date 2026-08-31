import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import type { CategoriesOptions } from "@/components/Pages/Admin/EditCategoriesPage";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { zeroUID } from "@/utilities/commons";
import { INDEXER } from "@/utilities/indexer";

const CategoriesOptionSchema = z
  .object({
    // The backend has returned both numeric and string category ids in the
    // wild — this field is never consumed by identity here, only sorted by
    // `name`, so accept either rather than inventing a stricter contract.
    id: z.union([z.string(), z.number()]),
    name: z.string(),
  })
  .passthrough();
const CategoriesResponseSchema = z.array(CategoriesOptionSchema);

const fetchCategories = async (communityId: string) => {
  if (!communityId || communityId === zeroUID) {
    throw new Error("Invalid community ID");
  }

  try {
    const data = await api.get(INDEXER.COMMUNITY.CATEGORIES(communityId), {
      schema: CategoriesResponseSchema,
    });
    return data.sort((a, b) => a.name.localeCompare(b.name, "en")) as CategoriesOptions[];
  } catch (error) {
    errorManager(`Error fetching categories of ${communityId}`, error);
    throw error;
  }
};

export const useCategories = (communityId: string) => {
  return useQuery<CategoriesOptions[], Error>({
    queryKey: ["categories", communityId],
    queryFn: () => fetchCategories(communityId),
    enabled: !!communityId && communityId !== zeroUID,
  });
};
