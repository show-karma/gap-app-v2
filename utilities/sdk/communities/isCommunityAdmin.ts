import { GAP, type SignerOrProvider } from "@show-karma/karma-gap-sdk";
import type { Hex } from "viem";
import { errorManager } from "@/components/Utilities/errorManager";
import type { CommunityDetailsV2 } from "@/types/community";

export const isCommunityAdminOf = async (
  community: CommunityDetailsV2,
  address: string | Hex,
  signer?: SignerOrProvider
) => {
  const { uid, chainID } = community;
  try {
    const resolver = await GAP.getCommunityResolver(signer, chainID).catch(() => null);
    const response = await resolver?.isAdmin?.(uid as Hex, address);
    return response;
  } catch (error: unknown) {
    errorManager(`Error checking if user ${address} is community(${uid}) admin`, error);
    return false;
  }
};
