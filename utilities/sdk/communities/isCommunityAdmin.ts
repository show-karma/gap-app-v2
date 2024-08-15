import type { Hex } from "viem";
import { GAP } from "@show-karma/karma-gap-sdk";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { errorManager } from "@/components/Utilities/errorManager";

export const isCommunityAdminOf = async (
  community: ICommunityResponse,
  address: string | Hex,
  signer?: any
) => {
  const { uid, chainID } = community;
  try {
    const resolver = await GAP.getCommunityResolver(signer, chainID).catch(
      () => null
    );
    const response = await resolver?.isAdmin?.(uid as Hex, address);
    return response;
  } catch (error: any) {
    errorManager(
      `Error checking if user ${address} is community(${uid}) admin`,
      error
    );
    return false;
  }
};
