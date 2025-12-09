import { GAP, type SignerOrProvider } from "@show-karma/karma-gap-sdk";
import type { Hex } from "viem";
import { errorManager } from "@/components/Utilities/errorManager";
import type { CommunityDetails } from "@/types/community";

/**
 * Check if a user is an admin of a community
 *
 * @param community - The community to check admin status for
 * @param address - The wallet address to check
 * @param signer - Optional signer for blockchain calls
 * @returns boolean - true if admin, false if not admin or if check fails
 */
export const isCommunityAdminOf = async (
  community: CommunityDetails,
  address: string | Hex,
  signer?: SignerOrProvider
): Promise<boolean> => {
  const { uid, chainID } = community;
  try {
    const resolver = await GAP.getCommunityResolver(signer, chainID);
    if (!resolver) {
      errorManager(`Community resolver not available for chain ${chainID}`, null, {
        uid,
        chainID,
        address,
      });
      return false;
    }

    const response = await resolver.isAdmin(uid as Hex, address);
    return response ?? false;
  } catch (error: unknown) {
    errorManager(`Error checking if user ${address} is community(${uid}) admin`, error, {
      uid,
      chainID,
      address,
    });
    return false;
  }
};
