import type { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { notFound } from "next/navigation";
import { cache } from "react";
import { zeroUID } from "@/utilities/commons";
import fetchData from "@/utilities/fetchData";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { INDEXER } from "@/utilities/indexer";

export const getCommunityData = cache(async (communityId: string): Promise<ICommunityResponse> => {
  try {
    const { data } = await gapIndexerApi.communityBySlug(communityId);

    if (!data || data?.uid === zeroUID || !data?.details?.data?.name) {
      notFound();
    }

    return data as ICommunityResponse;
  } catch (_error) {
    notFound();
  }
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
