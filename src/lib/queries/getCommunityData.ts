import { cache } from "react";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { gapIndexerApi } from "@/services/gap-indexer/gap-indexer";
import { zeroUID } from "@/lib/utils/misc";
import { notFound } from "next/navigation";
import fetchData from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";

export const getCommunityData = cache(
  async (communityId: string): Promise<ICommunityResponse> => {
    try {
      const { data } = await gapIndexerApi.communityBySlug(communityId);

      if (!data || data?.uid === zeroUID || !data?.details?.data?.name) {
        notFound();
      }

      return data as ICommunityResponse;
    } catch (error) {
      console.log("Not found community", communityId, error);
      notFound();
    }
  }
);

export const getCommunityCategories = cache(
  async (communityId: string): Promise<string[]> => {
    try {
      const [data] = await fetchData(INDEXER.COMMUNITY.CATEGORIES(communityId));

      if (data?.length) {
        const categoriesToOrder = data.map(
          (category: { name: string }) => category.name
        );
        return categoriesToOrder.sort((a: string, b: string) =>
          a.localeCompare(b, "en")
        );
      }

      return [];
    } catch (error) {
      console.log("Error fetching categories", communityId, error);
      return [];
    }
  }
);
