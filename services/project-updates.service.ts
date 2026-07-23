import { errorManager } from "@/components/Utilities/errorManager";
import type { UpdatesFeedFilters } from "@/types/v2/project-profile.types";
import type { UpdatesApiResponse } from "@/types/v2/roadmap";
import { api } from "@/utilities/api/client";
import { HttpError, isApiError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";

/**
 * Options bag for getProjectUpdates.
 */
export interface GetProjectUpdatesOptions extends UpdatesFeedFilters {
  milestoneStatus?: "pending" | "completed" | "verified";
  /**
   * Whether the request should attach a Privy auth token. Defaults to `true`.
   * Public SSR/prefetch callers pass `false` so the server-rendered path does
   * not touch the browser-only `TokenManager`.
   */
  isAuthorized?: boolean;
  signal?: AbortSignal;
}

/**
 * Applies the semantic rules for the AI evaluation params before serialisation:
 * - Never send `hasAIEvaluation=false` together with `aiScoreMin`/`aiScoreMax` — drop `hasAIEvaluation`.
 * - When `dateFrom` > `dateTo`, swap them defensively.
 * - When `aiScoreMin` > `aiScoreMax`, swap them defensively.
 * - Omit params that are empty string / undefined / null.
 */
function buildUpdatesQueryString(opts: GetProjectUpdatesOptions): string {
  const params = new URLSearchParams();

  // milestoneStatus
  if (opts.milestoneStatus) {
    params.set("milestoneStatus", opts.milestoneStatus);
  }

  // Date range — swap if inverted
  let { dateFrom, dateTo } = opts;
  if (dateFrom && dateTo && dateFrom > dateTo) {
    [dateFrom, dateTo] = [dateTo, dateFrom];
  }
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  // AI evaluation — enforce the mutual-exclusion rule:
  // never send hasAIEvaluation=false alongside aiScoreMin or aiScoreMax.
  const { hasAIEvaluation } = opts;
  let { aiScoreMin, aiScoreMax } = opts;

  // Swap min/max if inverted (defensive, matches dateFrom/dateTo swap pattern)
  if (aiScoreMin !== undefined && aiScoreMax !== undefined && aiScoreMin > aiScoreMax) {
    [aiScoreMin, aiScoreMax] = [aiScoreMax, aiScoreMin];
  }

  const hasMinScore = aiScoreMin !== undefined && aiScoreMin !== null;
  const hasMaxScore = aiScoreMax !== undefined && aiScoreMax !== null;
  const hasAnyScore = hasMinScore || hasMaxScore;

  if (hasAnyScore) {
    if (hasMinScore) params.set("aiScoreMin", String(aiScoreMin));
    if (hasMaxScore) params.set("aiScoreMax", String(aiScoreMax));
    // Omit hasAIEvaluation=false when any score param is present (backend returns 400)
    if (hasAIEvaluation === true) {
      params.set("hasAIEvaluation", "true");
    }
  } else if (hasAIEvaluation !== undefined && hasAIEvaluation !== null) {
    params.set("hasAIEvaluation", hasAIEvaluation ? "true" : "false");
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Fetches project updates, milestones, and grant milestones using the API endpoint.
 *
 * This is a unified endpoint that returns:
 * - projectUpdates: Project activity updates with associations (funding, indicators, deliverables)
 * - projectMilestones: Project milestones with completion details
 * - grantMilestones: Grant milestones with completion and verification details
 * - grantUpdates: Grant updates
 *
 * @param projectIdOrSlug - The project UID or slug
 * @param milestoneStatus - Optional milestone lifecycle filter
 * @param filters - Optional extra filters forwarded to the indexer
 * @returns UpdatesApiResponse containing all updates and milestones
 */
export const getProjectUpdates = async (
  projectIdOrSlug: string,
  milestoneStatus?: "pending" | "completed" | "verified",
  filters?: GetProjectUpdatesOptions
): Promise<UpdatesApiResponse> => {
  const emptyResponse: UpdatesApiResponse = {
    projectUpdates: [],
    projectMilestones: [],
    grantMilestones: [],
    grantUpdates: [],
  };

  const { isAuthorized = true, signal, ...queryFilters } = filters ?? {};
  const baseUrl = INDEXER.V2.PROJECTS.UPDATES(projectIdOrSlug);
  const qs = buildUpdatesQueryString({ milestoneStatus, ...queryFilters });
  const url = `${baseUrl}${qs}`;

  try {
    // TODO(#1775): add zod schema
    const data = await api.get<UpdatesApiResponse>(url, { isAuthorized, signal });
    if (!data) {
      errorManager("Project Updates API Error: empty response", undefined, {
        context: "project-updates.service",
      });
      return emptyResponse;
    }
    return data;
  } catch (error) {
    // Missing project routes are expected for unknown slugs and should not be sent to Sentry.
    if (isApiError(error) && error instanceof HttpError && error.status === 404) {
      return emptyResponse;
    }

    errorManager(`Project Updates API Error: ${error}`, error, {
      context: "project-updates.service",
    });
    return emptyResponse;
  }
};
