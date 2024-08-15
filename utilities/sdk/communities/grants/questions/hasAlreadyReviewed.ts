import type { Hex } from "@show-karma/karma-gap-sdk";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { errorManager } from "@/components/Utilities/errorManager";

export const hasAlreadyReviewed = async (
  grantUID: string | Hex,
  address: string | Hex
) => {
  try {
    const [data] = await fetchData(
      INDEXER.GRANTS.REVIEWS.USER_ANSWERED(grantUID, address)
    );
    return data?.answers?.length > 0;
  } catch (error: any) {
    errorManager(
      `Error checking if user ${address} has already reviewed grant: ${grantUID}`,
      error
    );
    return false;
  }
};
