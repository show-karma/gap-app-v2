import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Weight assigned to each impact indicator, keyed by indicator id.
 */
export interface IndicatorDistribution {
  [indicatorId: string]: number;
}

/**
 * Payload accepted by the project-discovery endpoint.
 */
export interface DiscoverProjectsPayload {
  programId: string;
  categoryId: string;
  endorsers: string[];
  indicatorDistribution: IndicatorDistribution;
}

/**
 * A single ranked project returned by the project-discovery endpoint.
 */
export interface ProjectDiscoveryResult {
  project: {
    grantId: string;
    programId: string;
    grantUID: string;
    chainID: number;
    grantTitle: string;
    projectUID: string;
    projectTitle: string;
    projectSlug: string;
    projectEndorsers: string[];
  };
  impactScore: number;
  impact: {
    impactIndicatorId: string;
    indicatorName: string;
    indicatorDescription: string;
    indicatorUnitOfMeasure: string;
    categoryId: string;
    categoryName: string;
    avgValue: number;
    minValue: number;
    maxValue: number;
    lastValue: number;
    lastTimestamp: string;
  }[];
}

interface ProjectDiscoveryResponse {
  data: ProjectDiscoveryResult[];
}

/**
 * Runs a project-discovery search for a community.
 *
 * @remarks
 * Throws (via `errorManager`) when the request fails so the consuming
 * mutation can surface a real error state with retry. Always resolves to a
 * typed array on success; an empty array means the search matched nothing.
 */
export const discoverProjects = async (
  communityId: string,
  payload: DiscoverProjectsPayload
): Promise<ProjectDiscoveryResult[]> => {
  const [response, error] = await fetchData(
    INDEXER.COMMUNITY.PROJECT_DISCOVERY(communityId),
    "POST",
    payload
  );

  if (error) {
    errorManager(`Error discovering projects for community ${communityId}`, error);
    throw new Error(error);
  }

  return (response as ProjectDiscoveryResponse | null)?.data ?? [];
};
