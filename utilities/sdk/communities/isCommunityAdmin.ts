import type { Community } from "@show-karma/karma-gap-sdk";
import { GAP } from "@show-karma/karma-gap-sdk";
import type { Hex } from "viem";
import { getCommunityDetails } from "./getCommunityDetails";

export const isCommunityAdminOf = async (
  community: Community,
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
      console.log("error", error);
      return false;
    });
  return response;
};
