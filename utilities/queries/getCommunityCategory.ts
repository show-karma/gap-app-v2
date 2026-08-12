import { z } from "zod";
import type { CategoriesOptions } from "@/components/Pages/Admin/EditCategoriesPage";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "../api/client";
import { INDEXER } from "../indexer";

const CategoriesOptionSchema = z
  .object({
    id: z.number(),
    name: z.string(),
  })
  .passthrough();

const CommunityCategoriesResponseSchema = z.array(CategoriesOptionSchema);

export const getCommunityCategory = async (communityId: string) => {
  try {
    const data = await api.get<CategoriesOptions[]>(INDEXER.COMMUNITY.CATEGORIES(communityId), {
      schema: CommunityCategoriesResponseSchema,
    });
    const orderedCategories = data.sort((a: CategoriesOptions, b: CategoriesOptions) => {
      return a.name.localeCompare(b.name, "en");
    });
    return orderedCategories;
  } catch (error) {
    console.error(error);
    errorManager("Error fetching community category", error);
    return [];
  }
};
