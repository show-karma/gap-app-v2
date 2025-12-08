import type { ProjectResponse } from "@/types/v2/project";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
import { getProjectGrants } from "./project-grants.service";

export const getProjectData = async (
  projectId: string,
  fetchOptions: RequestInit = {}
): Promise<ProjectResponse> => {
  // Fetch v2 project data
  const projectResponse = await fetch(
    `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.V2.PROJECTS.GET(projectId)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      ...fetchOptions,
    }
  );

  if (!projectResponse.ok) {
    throw new Error(`HTTP error! status: ${projectResponse.status}`);
  }

  const projectData: ProjectResponse = await projectResponse.json();

  // Fetch grants separately (v2 doesn't include grants in project response)
  // NOTE: Grants and Funding Applications are different concepts
  // - Funding Applications: /v2/funding-applications/project/${projectUID} (returns IFundingApplication)
  // - Grants: /v2/projects/:idOrSlug/grants (returns GrantResponse[])
  const grants = await getProjectGrants(projectData.details?.slug || projectId);

  // Add grants to the project data
  return {
    ...projectData,
    grants: grants || [],
  };
};
