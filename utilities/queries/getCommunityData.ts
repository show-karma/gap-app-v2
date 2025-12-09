import { notFound } from "next/navigation";
import { cache } from "react";
import type { CommunityDetailsV2 } from "@/types/community";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { getCommunityDetailsV2 } from "./getCommunityDataV2";

export const getCommunityDataV2 = async (communityId: string): Promise<CommunityDetailsV2> => {
  const data = await getCommunityDetailsV2(communityId);

  if (!data) {
    notFound();
  }

  return data;
};

export const getCommunityCategories = cache(async (communityId: string): Promise<string[]> => {
  try {
    const [data] = await fetchData(INDEXER.COMMUNITY.CATEGORIES(communityId));

    if (data?.length) {
      const categoriesToOrder = data.map((category: { name: string }) => category.name);
      return categoriesToOrder.sort((a: string, b: string) => a.localeCompare(b, "en"));
    }

    return [];
  } catch (_error) {
    return [];
  }
});
