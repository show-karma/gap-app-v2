import { GAP, type SignerOrProvider } from "@show-karma/karma-gap-sdk";
import type { Hex } from "viem";
import { errorManager } from "@/components/Utilities/errorManager";
import type { Community } from "@/types/v2/community";
import { getGapRpcConfig } from "@/utilities/gapRpcConfig";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

/**
 * Check if ANY of the given wallet addresses is an admin of a community.
 *
 * A single authenticated account can hold multiple wallets (e.g. several Privy
 * embedded wallets), and admin authority may sit on a non-active one. Resolve
 * the on-chain `isAdmin` check across every supplied wallet so the account is
 * authorized wherever the role lives. The resolver is fetched once and reused.
 *
 * @param community - The community to check admin status for
 * @param addresses - The wallet addresses to check
 * @param signer - Optional signer for blockchain calls
 * @returns boolean - true if any address is an admin, false otherwise or on failure
 */
export const isCommunityAdminOfAny = async (
  community: Community,
  addresses: (string | Hex)[],
  signer?: SignerOrProvider
): Promise<boolean> => {
  const { uid, chainID } = community;

  // Dedupe case-insensitively while preserving the original-cased address.
  const uniqueAddresses = Array.from(
    new Map(
      addresses.filter((address) => !!address).map((address) => [address.toLowerCase(), address])
    ).values()
  );
  if (uniqueAddresses.length === 0) return false;

  try {
    const resolver = await GAP.getCommunityResolver(signer, getGapRpcConfig(), chainID);
    if (!resolver) {
      errorManager(`Community resolver not available for chain ${chainID}`, null, {
        uid,
        chainID,
        addresses: uniqueAddresses,
      });
      return false;
    }

    const results = await Promise.all(
      uniqueAddresses.map((address) =>
        Promise.resolve(resolver.isAdmin(uid as Hex, address))
          .then((response) => response ?? false)
          .catch((error: unknown) => {
            errorManager(`Error checking if user ${address} is community(${uid}) admin`, error, {
              uid,
              chainID,
              address,
            });
            return false;
          })
      )
    );

    return results.some(Boolean);
  } catch (error: unknown) {
    errorManager(`Error checking community(${uid}) admin for addresses`, error, {
      uid,
      chainID,
      addresses: uniqueAddresses,
    });
    return false;
  }
};

/**
 * Check if a user is an admin of a community.
 *
 * @param community - The community to check admin status for
 * @param address - The wallet address to check
 * @param signer - Optional signer for blockchain calls
 * @returns boolean - true if admin, false if not admin or if check fails
 */
export const isCommunityAdminOf = async (
  community: Community,
  address: string | Hex,
  signer?: SignerOrProvider
): Promise<boolean> => isCommunityAdminOfAny(community, [address], signer);

/**
 * Check if ANY of the given wallet addresses is an admin of ANY of the given
 * communities, identified by UID or slug.
 *
 * A project may belong to several communities (via its grants), and managing
 * its team should be allowed if the user administers any one of them. Each
 * community is resolved to its on-chain details and checked in parallel; the
 * results are OR-ed together. Communities that fail to resolve are skipped.
 *
 * @param communityUIDs - Community UIDs (or slugs) to check
 * @param addresses - The wallet addresses to check
 * @param signer - Optional signer for blockchain calls
 * @returns boolean - true if any address is an admin of any community
 */
export const isAdminOfAnyCommunity = async (
  communityUIDs: string[],
  addresses: (string | Hex)[],
  signer?: SignerOrProvider
): Promise<boolean> => {
  const uniqueUIDs = Array.from(new Set(communityUIDs.filter(Boolean)));
  if (uniqueUIDs.length === 0 || addresses.length === 0) return false;

  const communities = await Promise.all(uniqueUIDs.map((uid) => getCommunityDetails(uid)));

  const checks = await Promise.all(
    communities
      .filter((community): community is Community => !!community)
      .map((community) => isCommunityAdminOfAny(community, addresses, signer))
  );

  return checks.some(Boolean);
};
