import { Hex } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

import { getGapClient } from "@/hooks/useGap";
import { appNetwork } from "@/utilities/network";

export const getCommunityDetails = async (uid: Hex) => {
  try {
    const gap = getGapClient(appNetwork[0].id);
    const communityDetail = await (uid.startsWith("0x")
      ? gap.fetch.communityById(uid as `0x${string}`)
      : gap.fetch.communityBySlug(uid));
    return communityDetail;
  } catch (error) {
    console.log(error);
    return undefined;
  }
};
