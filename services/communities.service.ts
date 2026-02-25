import * as Sentry from "@sentry/nextjs";
import { errorManager } from "@/components/Utilities/errorManager";
import type { Community } from "@/types/v2/community";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

interface CommunitiesListResponse {
  payload: Community[];
  pagination: {
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CommunityAdmin {
  id: string;
  admins: Array<{
    user: {
      id: string;
    };
  }>;
  status: CommunityAdminsBatchStatus;
}

export type CommunityAdminsBatchStatus =
  | "ok"
  | "community_not_found"
  | "subgraph_unavailable"
  | "rate_limited";

interface CommunityAdminsBatchResponse {
  data: Array<{
    communityUID: string;
    admins: CommunityAdmin["admins"];
    status: CommunityAdminsBatchStatus;
  }>;
  meta: {
    requestedCount: number;
    uniqueRequestedCount: number;
    foundCommunityCount: number;
    notFoundCount: number;
    unavailableCount: number;
  };
}

const MAX_RATE_LIMIT_RETRIES = 2;
const RATE_LIMIT_RETRY_BASE_DELAY_MS = 300;
const RATE_LIMIT_RETRY_MAX_DELAY_MS = 1200;
const RATE_LIMIT_TELEMETRY_SAMPLE_RATE = 0.1;

type RateLimitTelemetryOutcome = "recovered" | "rate_limited_fallback" | "non_rate_limit_failure";

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getRateLimitRetryDelay = (attempt: number): number =>
  Math.min(RATE_LIMIT_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), RATE_LIMIT_RETRY_MAX_DELAY_MS);

const shouldSampleRateLimitTelemetry = (): boolean =>
  Math.random() < RATE_LIMIT_TELEMETRY_SAMPLE_RATE;

const reportRateLimitTelemetry = ({
  rateLimitAttempts,
  communityCount,
  outcome,
  finalStatus,
  error,
}: {
  rateLimitAttempts: number;
  communityCount: number;
  outcome: RateLimitTelemetryOutcome;
  finalStatus: number;
  error: string | null;
}): void => {
  if (rateLimitAttempts <= 0 || !shouldSampleRateLimitTelemetry()) return;

  Sentry.captureMessage("Rate limited while fetching batch community admins", {
    level: "warning",
    tags: {
      context: "admin.community.batch-admins",
      outcome,
    },
    extra: {
      rateLimitAttempts,
      communityCount,
      finalStatus,
      error,
    },
  });
};

const buildUnavailableCommunityAdmins = (
  communityUIDs: string[],
  status: CommunityAdminsBatchStatus
): CommunityAdmin[] =>
  communityUIDs.map((uid) => ({
    id: uid,
    admins: [],
    status,
  }));

/**
 * Fetches all communities using V2 API endpoint
 *
 * @param options - Optional pagination and stats options
 * @returns Promise<Community[]> - Array of communities
 */
export const getCommunities = async (options?: {
  page?: number;
  limit?: number;
  includeStats?: boolean;
}): Promise<Community[]> => {
  const { page = 1, limit = 100, includeStats = false } = options ?? {};

  const [data, error] = await fetchData<CommunitiesListResponse>(
    INDEXER.COMMUNITY.LIST({ page, limit, includeStats })
  );

  if (error || !data) {
    errorManager(`Communities API Error: ${error}`, error, {
      context: "communities.service",
    });
    return [];
  }

  return data.payload ?? [];
};

/**
 * Fetches admins for a list of communities via batch endpoint.
 *
 * @param communityUIDs - Community UIDs to fetch admins for
 * @returns Promise<CommunityAdmin[]> - Admin list keyed by community id, including batch status
 */
export const getCommunityAdminsBatch = async (
  communityUIDs: string[]
): Promise<CommunityAdmin[]> => {
  if (!communityUIDs.length) return [];

  const maxAttempts = MAX_RATE_LIMIT_RETRIES + 1;
  let rateLimitAttempts = 0;
  let lastStatus = 500;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const [adminsResponse, adminsError, , adminsStatus] =
      await fetchData<CommunityAdminsBatchResponse>(
        INDEXER.COMMUNITY.ADMINS_BATCH(),
        "POST",
        { communityUIDs },
        {},
        {}
      );

    lastStatus = adminsStatus;

    if (adminsResponse?.data) {
      const adminsById = new Map(
        adminsResponse.data.map((item) => [
          item.communityUID,
          { id: item.communityUID, admins: item.admins, status: item.status },
        ])
      );

      if (rateLimitAttempts > 0) {
        reportRateLimitTelemetry({
          rateLimitAttempts,
          communityCount: communityUIDs.length,
          outcome: "recovered",
          finalStatus: adminsStatus,
          error: adminsError,
        });
      }

      return communityUIDs.map(
        (uid) =>
          adminsById.get(uid) || {
            id: uid,
            admins: [],
            status: "community_not_found",
          }
      );
    }

    if (adminsStatus === 429) {
      rateLimitAttempts += 1;

      if (attempt < maxAttempts) {
        await wait(getRateLimitRetryDelay(attempt));
        continue;
      }

      reportRateLimitTelemetry({
        rateLimitAttempts,
        communityCount: communityUIDs.length,
        outcome: "rate_limited_fallback",
        finalStatus: adminsStatus,
        error: adminsError,
      });

      return buildUnavailableCommunityAdmins(communityUIDs, "rate_limited");
    }

    if (rateLimitAttempts > 0) {
      reportRateLimitTelemetry({
        rateLimitAttempts,
        communityCount: communityUIDs.length,
        outcome: "non_rate_limit_failure",
        finalStatus: adminsStatus,
        error: adminsError,
      });
    }

    errorManager(
      "Error fetching batch community admins",
      adminsError || "Empty batch admins response",
      {
        context: "admin.community.batch-admins",
        status: adminsStatus,
      }
    );
    return buildUnavailableCommunityAdmins(communityUIDs, "subgraph_unavailable");
  }

  return buildUnavailableCommunityAdmins(
    communityUIDs,
    lastStatus === 429 ? "rate_limited" : "subgraph_unavailable"
  );
};
