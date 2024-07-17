import type { Hex } from "viem";
import { GAP } from "@show-karma/karma-gap-sdk/core/class/GAP";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

export const isCommunityAdminOf = async (
  community: ICommunityResponse,
  address: string | Hex,
  signer?: any
) => {
  const { uid, chainID } = community;

  const resolver = await GAP.getCommunityResolver(signer, chainID).catch(
    () => null
  );
  const response = await resolver
    ?.isAdmin?.(uid as Hex, address)
    .catch((error) => {
      return false;
    });
  return response;
};
