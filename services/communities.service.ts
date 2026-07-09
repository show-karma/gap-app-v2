import { errorManager } from "@/components/Utilities/errorManager";
import type { Community } from "@/types/v2/community";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

interface CommunitiesListResponse {
  payload: Community[];
  pagination: {
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CommunityAdmin {
  id: string;
  admins: Array<{
    user: {
      id: string;
    };
  }>;
  status: CommunityAdminsBatchStatus;
}

export type CommunityAdminsBatchStatus = "ok" | "community_not_found" | "subgraph_unavailable";

interface CommunityAdminsBatchResponse {
  data: Array<{
    communityUID: string;
    admins: CommunityAdmin["admins"];
    status: CommunityAdminsBatchStatus;
  }>;
  meta: {
    requestedCount: number;
    uniqueRequestedCount: number;
    foundCommunityCount: number;
    notFoundCount: number;
    unavailableCount: number;
  };
}

/**
 * Fetches all communities using V2 API endpoint
 *
 * @param options - Optional pagination and stats options
 * @returns Promise<Community[]> - Array of communities
 */
export const getCommunities = async (options?: {
  page?: number;
  limit?: number;
  includeStats?: boolean;
}): Promise<Community[]> => {
  const { page = 1, limit = 100, includeStats = false } = options ?? {};

  try {
    // TODO(#1775): add zod schema
    const data = await api.get<CommunitiesListResponse>(
      INDEXER.COMMUNITY.LIST({ page, limit, includeStats })
    );
    if (!data) {
      errorManager(`Communities API Error: ${null}`, null, {
        context: "communities.service",
      });
      return [];
    }
    return data.payload ?? [];
  } catch (error) {
    errorManager(`Communities API Error: ${error}`, error, {
      context: "communities.service",
    });
    return [];
  }
};

/**
 * Fetches admins for a list of communities via batch endpoint.
 *
 * @param communityUIDs - Community UIDs to fetch admins for
 * @returns Promise<CommunityAdmin[]> - Admin list keyed by community id, including batch status
 */
export const getCommunityAdminsBatch = async (
  communityUIDs: string[]
): Promise<CommunityAdmin[]> => {
  if (!communityUIDs.length) return [];

  let adminsResponse: CommunityAdminsBatchResponse | undefined;
  try {
    // TODO(#1775): add zod schema
    adminsResponse = await api.post<CommunityAdminsBatchResponse>(
      INDEXER.COMMUNITY.ADMINS_BATCH(),
      { communityUIDs }
    );
  } catch (error) {
    errorManager("Error fetching batch community admins", error, {
      context: "admin.community.batch-admins",
    });
    throw error instanceof Error ? error : new Error("Failed to fetch batch community admins");
  }

  if (!adminsResponse?.data) {
    errorManager("Error fetching batch community admins", "Empty batch admins response", {
      context: "admin.community.batch-admins",
    });
    throw new Error("Failed to fetch batch community admins");
  }

  const adminsById = new Map(
    adminsResponse.data.map((item) => [
      item.communityUID,
      { id: item.communityUID, admins: item.admins, status: item.status },
    ])
  );

  return communityUIDs.map(
    (uid) =>
      adminsById.get(uid) || {
        id: uid,
        admins: [],
        status: "community_not_found",
      }
  );
};
