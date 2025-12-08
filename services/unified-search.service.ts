/**
 * Unified Search Service - V2 API
 * Uses the unified /v2/search endpoint for searching projects and communities
 */

import { errorManager } from "@/components/Utilities/errorManager";
import type { Community } from "@/types/v2/community";
import type { ProjectResponse } from "@/types/v2/project";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";

export interface UnifiedSearchResponse {
  projects: ProjectResponse[];
  communities: Community[];
}

interface UnifiedSearchApiResponse {
  statusCode: number;
  result: {
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
    error: null;
  };
}

const apiClient = createAuthenticatedApiClient(envVars.NEXT_PUBLIC_GAP_INDEXER_URL);

/**
 * Transform API response to match existing UnifiedSearchResponse format
 */
const transformSearchResponse = (apiResponse: UnifiedSearchApiResponse): UnifiedSearchResponse => {
  const { projects, communities } = apiResponse.result.data;

  return {
    projects: projects.map((p) => ({
      uid: p.uid,
      chainID: p.chainID,
      details: {
        title: p.title || undefined,
        slug: p.slug || undefined,
        description: p.description || undefined,
        logoUrl: p.logoUrl || undefined,
      },
      createdAt: p.createdAt,
    })) as ProjectResponse[],
    communities: communities.map((c) => ({
      uid: c.uid,
      chainID: c.chainID,
      details: {
        name: c.name || undefined,
        slug: c.slug || undefined,
        description: c.description || undefined,
        imageURL: c.imageUrl || undefined,
      },
      createdAt: c.createdAt,
    })) as Community[],
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

  try {
    const response = await apiClient.get<UnifiedSearchApiResponse>(
      `/v2/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );

    return transformSearchResponse(response.data);
  } catch (error) {
    errorManager(`Error in unified search: ${error}`, error);
    return { projects: [], communities: [] };
  }
};
