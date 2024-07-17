import { Hex } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

import { getGapClient } from "@/hooks/useGap";
import { appNetwork } from "@/utilities/network";

export const getCommunitiesOf = async (address: Hex) => {
  try {
    const gap = getGapClient(appNetwork[0].id);
    const communities = await gap.fetch.communitiesAdminOf(address);
    return communities;
  } catch (error) {
    console.log(error);
    return [];
  }
};
