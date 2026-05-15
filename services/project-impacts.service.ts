import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
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
  const [data, error] = await fetchData<ProjectImpact[]>(
    INDEXER.V2.PROJECTS.IMPACTS(projectIdOrSlug),
    "GET",
    {},
    {},
    {},
    isAuthorized,
    false,
    undefined,
    signal
  );

  if (error || !data) {
    errorManager(`Project Impacts API Error: ${error}`, error, {
      context: "project-impacts.service",
    });
    return [];
  }

  return data;
};
