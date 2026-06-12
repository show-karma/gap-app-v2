import type { SignerOrProvider } from "@show-karma/karma-gap-sdk";
import type { Hex } from "viem";
import { errorManager } from "@/components/Utilities/errorManager";
import type { Community } from "@/types/v2/community";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
import { getCommunityDetails } from "@/utilities/queries/v2/community";
import { isCommunityAdminOfAny } from "@/utilities/sdk/communities/isCommunityAdmin";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

const apiClient = createAuthenticatedApiClient(API_URL, 30000);

interface ResolveEmailResponse {
  walletAddress: string;
}

export interface UserProfileInfo {
  publicAddress: string;
  name: string;
  email: string;
}

export interface PublicUserProfileInfo {
  publicAddress: string;
  name: string;
  email?: string;
  picture?: string;
}

/**
 * Service for community admin operations requiring server-side email resolution
 */
export const communityAdminsService = {
  /**
   * Resolve an email address to a wallet address via the backend Privy resolver.
   * Returns the lowercase wallet address to use for on-chain EAS attestations.
   */
  async resolveEmailToWallet(email: string, name?: string): Promise<string> {
    const body: { email: string; name?: string } = { email };
    if (name) body.name = name;

    const response = await apiClient.post<ResolveEmailResponse>(INDEXER.USERS.RESOLVE_EMAIL, body);

    return response.data.walletAddress.toLowerCase();
  },

  /**
   * Batch lookup user profiles (name, email) for wallet addresses.
   * Returns a map of lowercase address -> profile info.
   */
  async getUserProfiles(addresses: string[]): Promise<Map<string, UserProfileInfo>> {
    if (addresses.length === 0) return new Map();

    const response = await apiClient.get<UserProfileInfo[]>(
      INDEXER.USERS.PROFILES(addresses.join(","))
    );

    const map = new Map<string, UserProfileInfo>();
    for (const profile of response.data) {
      map.set(profile.publicAddress.toLowerCase(), profile);
    }
    return map;
  },

  /**
   * Batch lookup public user profiles (name, email, picture) for wallet addresses.
   * This endpoint is public-ish — on 401/403, returns an empty map instead of throwing.
   * Returns a map of lowercase address -> public profile info.
   */
  async getPublicUserProfiles(addresses: string[]): Promise<Map<string, PublicUserProfileInfo>> {
    if (addresses.length === 0) return new Map();

    try {
      const response = await apiClient.get<PublicUserProfileInfo[]>(
        INDEXER.USERS.PUBLIC_PROFILES(addresses)
      );

      const map = new Map<string, PublicUserProfileInfo>();
      for (const profile of response.data) {
        map.set(profile.publicAddress.toLowerCase(), profile);
      }
      return map;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      // Graceful fallback for auth errors — component must never crash
      if (status === 401 || status === 403) {
        return new Map();
      }
      throw error;
    }
  },
};

/**
 * Resolve whether ANY of the given wallet addresses is an admin of ANY of the
 * given communities, identified by UID or slug.
 *
 * A project may belong to several communities (via its grants), and managing
 * its team should be allowed if the user administers any one of them. Each
 * community's details are fetched, then the on-chain admin check runs in
 * parallel and the results are OR-ed together. Communities that fail to resolve
 * are skipped, and any unexpected failure resolves to `false` (logged) so
 * callers never throw from an authorization check.
 *
 * @param communityUIDs - Community UIDs (or slugs) to check
 * @param addresses - The wallet addresses to check
 * @param signer - Optional signer for blockchain calls
 */
export const isAdminOfAnyCommunity = async (
  communityUIDs: string[],
  addresses: (string | Hex)[],
  signer?: SignerOrProvider
): Promise<boolean> => {
  const uniqueUIDs = Array.from(new Set(communityUIDs.filter(Boolean)));
  if (uniqueUIDs.length === 0 || addresses.length === 0) return false;

  try {
    const communities = await Promise.all(uniqueUIDs.map((uid) => getCommunityDetails(uid)));

    const checks = await Promise.all(
      communities
        .filter((community): community is Community => !!community)
        .map((community) => isCommunityAdminOfAny(community, addresses, signer))
    );

    return checks.some(Boolean);
  } catch (error: unknown) {
    errorManager("Error checking admin across communities", error, {
      communityUIDs: uniqueUIDs,
      addresses,
    });
    return false;
  }
};
