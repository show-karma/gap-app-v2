import { errorManager } from "@/components/Utilities/errorManager";
import type { Project as ProjectResponse } from "@/types/v2/project";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

interface SlugAvailabilityResult {
  available: boolean;
  existingProject?: {
    uid: string;
    slug: string;
  } | null;
}

/**
 * Check if a project slug exists (is taken).
 * Uses the V2 endpoint which returns proper 200 responses instead of 404 errors.
 * This is useful for polling during project creation to avoid Sentry noise.
 *
 * @returns true if the slug is taken (project exists), false if available
 */
export const checkSlugExists = async (slug: string): Promise<boolean> => {
  const [data, error] = await fetchData<SlugAvailabilityResult>(
    INDEXER.V2.PROJECTS.SLUG_CHECK(slug)
  );

  if (error) {
    // If there's an error, we can't determine availability - assume not available
    return false;
  }

  // available = true means slug is free (project doesn't exist)
  // available = false means slug is taken (project exists)
  return !data?.available;
};

export const getProject = async (projectIdOrSlug: string): Promise<ProjectResponse | null> => {
  const [projectData, error, , status] = await fetchData<ProjectResponse>(
    INDEXER.V2.PROJECTS.GET(projectIdOrSlug)
  );

  if (error) {
    // Don't report 404s to Sentry - they're expected when users visit non-existent project URLs
    if (status !== 404) {
      errorManager(`Project API Error: ${error}`, error, {
        context: "project.service",
      });
    }
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
