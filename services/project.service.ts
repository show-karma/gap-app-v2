import { errorManager } from "@/components/Utilities/errorManager";
import type { ProjectResponse } from "@/types/v2/project";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { getProjectGrants } from "./project-grants.service";

export const getProjectData = async (projectId: string): Promise<ProjectResponse> => {
  // Fetch v2 project data using fetchData for consistent auth handling
  const [projectData, error] = await fetchData<ProjectResponse>(INDEXER.V2.PROJECTS.GET(projectId));

  if (error || !projectData) {
    errorManager(`Project Data API Error: ${error}`, error, {
      context: "project.service",
    });
    throw new Error(`Failed to fetch project data: ${error || "Unknown error"}`);
  }

  // Fetch grants separately (v2 doesn't include grants in project response)
  // NOTE: Grants and Funding Applications are different concepts
  // - Funding Applications: /v2/funding-applications/project/${projectUID} (returns IFundingApplication)
  // - Grants: /v2/projects/:idOrSlug/grants (returns GrantResponse[])
  const grants = await getProjectGrants(projectData.details?.slug || projectId);

  // Add grants to the project data
  return {
    ...projectData,
    grants: grants ?? [],
  };
};
