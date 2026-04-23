import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";

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
