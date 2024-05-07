import type { Hex } from "viem";
import { GAP } from "@show-karma/karma-gap-sdk";

export const isCommunityAdminOf = async (
  community: { uid: Hex; chainID: number },
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
