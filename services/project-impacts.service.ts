import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";

export interface ProjectImpactVerification {
  uid: string;
  attester?: string;
  createdAt?: string;
}

export interface ProjectImpact {
  uid: string;
  refUID: string;
  chainID: number;
  data?: {
    work?: string;
    impact?: string;
    proof?: string;
    startDate?: number;
    endDate?: number;
  };
  verified?: ProjectImpactVerification[];
  createdAt?: string;
  updatedAt?: string;
}

interface GetProjectImpactsOptions {
  /**
   * Whether the request should attach a Privy auth token. Defaults to `true`.
   * Public SSR/prefetch callers pass `false` so the server-rendered path does
   * not touch the browser-only `TokenManager`.
   */
  isAuthorized?: boolean;
  signal?: AbortSignal;
}

/**
 * Fetches project impacts using the dedicated API endpoint.
 *
 * @param projectIdOrSlug - The project UID or slug
 * @returns Promise<ProjectImpact[]> - Array of project impacts
 */
export const getProjectImpacts = async (
  projectIdOrSlug: string,
  options: GetProjectImpactsOptions = {}
): Promise<ProjectImpact[]> => {
  const { isAuthorized = true, signal } = options;

  let data: ProjectImpact[] | null;
  try {
    // TEMP: use the V1 impacts route until the V2 endpoint ships (gap-indexer#2178),
    // then switch back to INDEXER.V2.PROJECTS.IMPACTS.
    // TODO(#1775): add zod schema
    data = await api.get<ProjectImpact[]>(INDEXER.PROJECT.IMPACTS(projectIdOrSlug), {
      isAuthorized,
      signal,
    });
  } catch (error) {
    // A 404 means the project/slug has no impacts (unknown slug, crawler
    // traffic, or a project with none yet) — an expected empty result, not a
    // reportable error. Mirrors project-grants.service / project-updates.service.
    // See GAP-FRONTEND-24Z.
    if (error instanceof HttpError && error.status === 404) {
      return [];
    }

    errorManager(`Project Impacts API Error: ${error}`, error, {
      context: "project-impacts.service",
    });
    return [];
  }

  if (!Array.isArray(data)) {
    // The endpoint returns `null` for an unknown slug — also expected empty.
    return [];
  }

  return data;
};
