/**
 * Unified Search Service - V2 API
 * Uses the unified /v2/search endpoint for searching projects and communities
 */

import { errorManager } from "@/components/Utilities/errorManager";
import type { Community } from "@/types/v2/community";
import type { Project as ProjectResponse } from "@/types/v2/project";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Search result types - these represent the minimal data returned from search
 * They are compatible with the full ProjectResponse and Community types
 */
export type SearchProjectResult = Pick<ProjectResponse, "uid" | "chainID" | "createdAt"> & {
  details: {
    title?: string;
    slug?: string;
    description?: string;
    logoUrl?: string;
  };
};

export type SearchCommunityResult = Pick<Community, "uid" | "chainID" | "createdAt"> & {
  details: {
    name?: string;
    slug?: string;
    description?: string;
    imageURL?: string;
  };
};

export interface UnifiedSearchResponse {
  projects: SearchProjectResult[];
  communities: SearchCommunityResult[];
}

interface UnifiedSearchApiResponse {
  data: {
    projects: Array<{
      uid: string;
      chainID: number;
      title: string | null;
      slug: string | null;
      description: string | null;
      logoUrl: string | null;
      createdAt: string;
    }>;
    communities: Array<{
      uid: string;
      chainID: number;
      name: string | null;
      slug: string | null;
      description: string | null;
      imageUrl: string | null;
      createdAt: string;
    }>;
  };
}

/**
 * Transform API response to match existing UnifiedSearchResponse format
 * Updated to use V2 API response format: { data: { projects, communities } }
 */
const transformSearchResponse = (apiResponse: UnifiedSearchApiResponse): UnifiedSearchResponse => {
  const { projects, communities } = apiResponse.data;

  return {
    projects: projects.map((p) => ({
      uid: p.uid as `0x${string}`,
      chainID: p.chainID,
      details: {
        title: p.title || undefined,
        slug: p.slug || undefined,
        description: p.description || undefined,
        logoUrl: p.logoUrl || undefined,
      },
      createdAt: p.createdAt,
    })),
    communities: communities.map((c) => ({
      uid: c.uid as `0x${string}`,
      chainID: c.chainID,
      details: {
        name: c.name || undefined,
        slug: c.slug || undefined,
        description: c.description || undefined,
        imageURL: c.imageUrl || undefined,
      },
      createdAt: c.createdAt,
    })),
  };
};

/**
 * Unified search that returns both projects and communities
 * Uses the v2 unified search endpoint for server-side search
 * @param query Search query (minimum 3 characters)
 * @param limit Maximum results per type (default: 10)
 * @returns Combined search results with V2 structure
 */
export const unifiedSearch = async (
  query: string,
  limit: number = 10
): Promise<UnifiedSearchResponse> => {
  if (query.length < 3) {
    return { projects: [], communities: [] };
  }

  const [data, error] = await fetchData<UnifiedSearchApiResponse>(INDEXER.V2.SEARCH(query, limit));

  if (error || !data) {
    errorManager(
      `Error in unified search for query "${query}" with limit ${limit}: ${error}`,
      error
    );
    return { projects: [], communities: [] };
  }

  return transformSearchResponse(data);
};
