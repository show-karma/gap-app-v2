import type { ProjectV2Response } from "@/types/project";
import { envVars } from "../enviromentVars";
import { INDEXER } from "../indexer";
import { getProjectGrants } from "./projectGrants";

export const getProjectData = async (
  projectId: string,
  fetchOptions: RequestInit = {}
): Promise<ProjectV2Response> => {
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

  const v2ProjectData: ProjectV2Response = await projectResponse.json();

  // Fetch grants separately (v2 doesn't include grants in project response)
  // NOTE: Grants and Funding Applications are different concepts
  // - Funding Applications: /v2/funding-applications/project/${projectUID} (returns IFundingApplication)
  // - Grants: Using v1 endpoint temporarily /projects/:idOrSlug/grants (returns IGrantResponse[])
  //   TODO: Update to v2 endpoint once available: /v2/projects/${projectUID}/grants
  const grants = await getProjectGrants(v2ProjectData.details?.slug || projectId, fetchOptions);

  // Add grants to the project data
  return {
    ...v2ProjectData,
    grants: grants || [],
  };
};
