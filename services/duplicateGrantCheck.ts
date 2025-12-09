import { errorManager } from "@/components/Utilities/errorManager";
import { getProjectData } from "@/services/project.service";

export interface DuplicateCheckParams {
  projectUid?: string;
  programId?: string;
  community: string;
  title: string;
}

/**
 * Check if a grant already exists in a project
 * @param params - Parameters to check for duplicate grants
 * @returns Promise<boolean> - True if duplicate exists, false otherwise
 */
export async function checkForDuplicateGrant(params: DuplicateCheckParams): Promise<boolean> {
  try {
    if (!params.projectUid) {
      return false;
    }

    // Fetch fresh project data using V2 API
    const freshProject = await getProjectData(params.projectUid);

    const grants = freshProject?.grants ?? [];
    if (grants.length === 0) {
      return false;
    }

    // Check for duplicate based on grant type
    const duplicate = grants.some((grant) => {
      if (params.programId) {
        // For program grants: match by programId (base part before underscore)
        const existingProgramId = grant.details?.programId;
        if (!existingProgramId) return false;

        const selectedProgramId = params.programId.split("_")[0];
        const existingProgramIdBase = existingProgramId.split("_")[0];

        return existingProgramIdBase === selectedProgramId;
      } else {
        // For regular grants: match by community AND title
        const existingCommunity = grant.communityUID;
        const existingTitle = grant.details?.title;

        return (
          existingCommunity === params.community &&
          existingTitle?.toLowerCase().trim() === params.title?.toLowerCase().trim()
        );
      }
    });

    return duplicate;
  } catch (error) {
    errorManager("Error checking for duplicate grant", error, {
      context: "duplicateGrantCheck.service",
      projectUid: params.projectUid,
    });
    return false;
  }
}
