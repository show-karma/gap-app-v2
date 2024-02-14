import type { Hex } from "@show-karma/karma-gap-sdk";
import axios from "axios";

import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";

export const hasAlreadyReviewed = async (
  grantUID: string | Hex,
  address: string | Hex
) => {
  try {
    const [data] = await fetchData(
      INDEXER.GRANTS.REVIEWS.USER_ANSWERED(grantUID, address)
    );
    return data?.answers?.length > 0;
  } catch (error) {
    return false;
  }
};
