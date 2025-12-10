import { errorManager } from "@/components/Utilities/errorManager";
import type { ProjectResponse } from "@/types/v2/project";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const getProject = async (projectIdOrSlug: string): Promise<ProjectResponse | null> => {
  const [projectData, error] = await fetchData<ProjectResponse>(
    INDEXER.V2.PROJECTS.GET(projectIdOrSlug)
  );

  if (error) {
    errorManager(`Project API Error: ${error}`, error, {
      context: "project.service",
    });
    return null;
  }

  return projectData || null;
};

export const adminTransferOwnership = async (
  projectUid: string,
  chainId: number,
  newOwnerAddress: string
): Promise<void> => {
  const [, error] = await fetchData(
    `/attestations/transfer-ownership/${projectUid}/${chainId}/${newOwnerAddress}`,
    "POST",
    {}
  );

  if (error) {
    throw error;
  }
};
