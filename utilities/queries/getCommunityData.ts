import { notFound } from "next/navigation";
import { cache } from "react";
import type { Community } from "@/types/v2/community";
import { zeroUID } from "@/utilities/commons";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const getCommunityData = cache(async (communityId: string): Promise<Community> => {
  const [data, error] = await fetchData<Community>(INDEXER.COMMUNITY.V2.GET(communityId));

  if (error || !data || data?.uid === zeroUID || !data?.details?.name) {
    notFound();
  }

  return data;
});

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
