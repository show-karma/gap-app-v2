import { errorManager } from "@/components/Utilities/errorManager";
import type { CommunityGrant } from "@/types/v2/community-grant";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

/**
 * Fetches grants for a community using V2 endpoint
 *
 * V2 endpoint: /v2/communities/:slug/grants
 * - Returns grants with project details, categories, and descriptions
 * - Used for edit-categories admin page
 *
 * @param communitySlug - The community slug or UID
 * @returns Promise<CommunityGrant[]> - Array of community grants
 */
export const getCommunityGrants = async (communitySlug: string): Promise<CommunityGrant[]> => {
  try {
    // TODO(#1775): add zod schema
    const data = await api.get<CommunityGrant[]>(INDEXER.COMMUNITY.V2.GRANTS(communitySlug));
    if (!data) {
      errorManager(`Community Grants API Error: ${null}`, null, {
        context: "community-grants.service",
        communitySlug,
      });
      return [];
    }
    return data;
  } catch (error) {
    errorManager(`Community Grants API Error: ${error}`, error, {
      context: "community-grants.service",
      communitySlug,
    });
    return [];
  }
};
