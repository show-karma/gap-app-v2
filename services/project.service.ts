import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";

const SlugAvailabilityResultSchema = z
  .object({
    available: z.boolean(),
    existingProject: z
      .object({
        uid: z.string(),
        slug: z.string(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

/**
 * Check if a project slug exists (is taken).
 * Uses the V2 endpoint which returns proper 200 responses instead of 404 errors.
 * This is useful for polling during project creation to avoid Sentry noise.
 *
 * @returns true if the slug is taken (project exists), false if available
 */
export const checkSlugExists = async (slug: string): Promise<boolean> => {
  try {
    const data = await api.get<z.infer<typeof SlugAvailabilityResultSchema>>(
      INDEXER.V2.PROJECTS.SLUG_CHECK(slug),
      { schema: SlugAvailabilityResultSchema }
    );

    // available = true means slug is free (project doesn't exist)
    // available = false means slug is taken (project exists)
    return !data?.available;
  } catch {
    // SUPPRESSED: mirrors legacy fetchData behavior — this powers polling during
    // project creation, so any failure degrades to "not available" rather than
    // creating Sentry noise for an expected transient state.
    return false;
  }
};

export const getProject = async (projectIdOrSlug: string): Promise<ProjectResponse | null> => {
  try {
    // TODO(#1775): add zod schema
    return await api.get<ProjectResponse>(INDEXER.V2.PROJECTS.GET(projectIdOrSlug));
  } catch (error) {
    // Unknown slugs are expected on public routes and should not create Sentry noise.
    if (error instanceof HttpError && error.status === 404) {
      return null;
    }

    errorManager(`Project API Error: ${error}`, error, {
      context: "project.service",
    });
    return null;
  }
};

export const adminTransferOwnership = async (
  projectUid: string,
  chainId: number,
  newOwnerAddress: string
): Promise<void> => {
  await api.post(
    `/attestations/transfer-ownership/${projectUid}/${chainId}/${newOwnerAddress}`,
    {}
  );
};
