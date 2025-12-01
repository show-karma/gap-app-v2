import type { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { type ProjectV2Response, projectV2ToV1 } from "../adapters/projectV2ToV1";
import { envVars } from "../enviromentVars";
import { INDEXER } from "../indexer";
import { getProjectGrants } from "./projectGrants";

export const getProjectData = async (
  projectId: string,
  fetchOptions: RequestInit
): Promise<IProjectResponse | undefined> => {
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
  const grants = await getProjectGrants(v2ProjectData.uid, fetchOptions);

  // Transform v2 response to v1 format
  const v1ProjectData = projectV2ToV1(v2ProjectData, grants);

  return v1ProjectData;
};
