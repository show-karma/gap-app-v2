import { errorManager } from "@/components/Utilities/errorManager";
import type { Grant } from "@/types/v2/grant";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";

interface GetProjectGrantsOptions {
  /**
   * Whether the request should attach a Privy auth token. Defaults to `true`
   * to preserve existing authenticated behaviour. The public project-profile
   * SSR/prefetch path explicitly passes `false` to avoid touching the
   * browser-only `TokenManager` on the server, which is the root cause of
   * `Error: Connection closed.` events on `/project/:projectId/funding`.
   */
  isAuthorized?: boolean;
  signal?: AbortSignal;
  /**
   * Throw instead of returning an empty result when the request fails for any
   * reason other than a 404. The cached SSR loaders (`services/project.cached.ts`)
   * pass `true`: an error thrown inside `"use cache"` is not stored, while an
   * empty result would be served as the project's data for the whole cache
   * lifetime.
   */
  rethrow?: boolean;
}

/**
 * Fetches grants for a project using V2 endpoint
 *
 * NOTE: Grants and Funding Applications are different concepts
 * - Funding Applications: /v2/funding-applications/project/${projectUID} (returns IFundingApplication)
 * - Grants: /v2/projects/:idOrSlug/grants (returns Grant[])
 *
 * V2 endpoint: /v2/projects/:idOrSlug/grants
 * - Returns grants with milestones, updates, and completion data
 * - Dates are returned as ISO strings (not MongoDB objects)
 * - Supports both UID and slug identifiers
 */
export const getProjectGrants = async (
  projectIdOrSlug: string,
  options: GetProjectGrantsOptions = {}
): Promise<Grant[]> => {
  const { isAuthorized = true, signal, rethrow = false } = options;

  let data: Grant | Grant[] | null;
  try {
    // TODO(#1775): add zod schema
    data = await api.get<Grant | Grant[]>(INDEXER.V2.PROJECTS.GRANTS(projectIdOrSlug), {
      isAuthorized,
      signal,
    });
  } catch (error) {
    // Missing project routes are expected for unknown slugs and should not be sent to Sentry.
    if (error instanceof HttpError && error.status === 404) {
      return [];
    }

    errorManager(`Project Grants API Error: ${error}`, error, {
      context: "project-grants.service",
    });
    if (rethrow) throw error;
    return [];
  }

  if (!data) {
    errorManager("Project Grants API Error: empty response", null, {
      context: "project-grants.service",
    });
    return [];
  }

  // Handle both single application and array of applications
  if (Array.isArray(data)) {
    return data;
  }

  // Handle single grant object
  return [data];
};
