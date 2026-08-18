import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { api } from "@/utilities/api/client";
import { ContractViolationError, HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";

const SlugAvailabilityResultSchema = z
  .object({
    available: z.boolean(),
    // Mirrors the indexer's CheckSlugAvailabilityResponseSchema ({ uid, title }).
    // Kept passthrough and every field optional on purpose: only `available` is
    // read here, and a stricter shape once turned a "slug is taken" response
    // into a contract violation that stalled the project-creation poll forever.
    existingProject: z
      .object({
        uid: z.string().optional(),
        title: z.string().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

// The slug check is called from a polling loop (up to 1000 iterations during
// project creation), and a contract violation is deterministic — it would fire
// on every single tick. Sentry fingerprints them into one issue, but reporting
// once per loaded module is enough to diagnose the drift without burning quota.
let contractViolationReported = false;

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
  } catch (error) {
    // SUPPRESSED: mirrors legacy fetchData behavior — this powers polling during
    // project creation, so a failure degrades to "not available" rather than
    // creating Sentry noise for an expected transient state. The one exception
    // is a contract violation: that is a real defect, not a transient state, and
    // it silently turns "slug is taken" into "slug is free" and hangs the poll.
    if (error instanceof ContractViolationError && !contractViolationReported) {
      contractViolationReported = true;
      errorManager(`Project slug check contract violation: ${slug}`, error, {
        context: "project.service",
      });
    }
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
