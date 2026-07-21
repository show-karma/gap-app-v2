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

export type CommunityAdminsBatchStatus = "ok" | "community_not_found" | "subgraph_unavailable";

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

// The batch endpoint authorizes and resolves each community with a live
// on-chain / subgraph call and caps a request at 200 UIDs. A single request
// covering every community (an owner sees all of them) therefore fans out
// O(N) upstream calls with no per-call timeout — one community on a dead RPC
// chain hangs the whole request past the gateway timeout, freezing /admin.
// Split into small chunks, each with its own abort timeout, so a hung chunk
// is dropped to "unavailable" for its communities while the rest resolve fast.
const ADMINS_BATCH_CHUNK_SIZE = 20;
// Sits above the backend's own worst case (10s subgraph timeout + one retry ≈
// 20s) so a slow-but-working chunk isn't aborted and falsely marked unavailable.
const ADMINS_BATCH_CHUNK_TIMEOUT_MS = 25_000;
const ADMINS_BATCH_CHUNK_CONCURRENCY = 4;
const ADMINS_BATCH_CHUNK_MAX_ATTEMPTS = 2;

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

/**
 * Fetches admins for a single ≤200-UID chunk with an abort timeout, retrying
 * once on a transient failure. A timeout/abort is NOT retried — it signals a
 * genuinely slow/unreachable upstream, so retrying would only double the wait
 * before the caller degrades the chunk's communities to "unavailable". Rejects
 * on transport error, empty response, or timeout.
 */
const fetchCommunityAdminsChunk = async (communityUIDs: string[]): Promise<CommunityAdmin[]> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < ADMINS_BATCH_CHUNK_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ADMINS_BATCH_CHUNK_TIMEOUT_MS);

    try {
      const [adminsResponse, adminsError] = await fetchData<CommunityAdminsBatchResponse>(
        INDEXER.COMMUNITY.ADMINS_BATCH(),
        "POST",
        { communityUIDs },
        {},
        {},
        true,
        false,
        undefined,
        controller.signal
      );

      if (!adminsResponse?.data) {
        throw new Error(adminsError || "Empty batch admins response");
      }

      return adminsResponse.data.map((item) => ({
        id: item.communityUID,
        admins: item.admins,
        status: item.status,
      }));
    } catch (error) {
      lastError = error;
      // Don't retry a timeout — the upstream is slow/unreachable, not flaky.
      if (controller.signal.aborted) break;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to fetch community admins chunk");
};

/**
 * Fetches admins for a list of communities via the batch endpoint, chunked and
 * fault-isolated so a single hung/failed chunk degrades gracefully instead of
 * timing out the whole page.
 *
 * @param communityUIDs - Community UIDs to fetch admins for
 * @returns Promise<CommunityAdmin[]> - Admin list keyed by community id, including batch status
 */
export const getCommunityAdminsBatch = async (
  communityUIDs: string[]
): Promise<CommunityAdmin[]> => {
  if (!communityUIDs.length) return [];

  const uniqueUIDs = [...new Set(communityUIDs)];
  const chunks = chunkArray(uniqueUIDs, ADMINS_BATCH_CHUNK_SIZE);
  const adminsById = new Map<string, CommunityAdmin>();

  for (let index = 0; index < chunks.length; index += ADMINS_BATCH_CHUNK_CONCURRENCY) {
    const wave = chunks.slice(index, index + ADMINS_BATCH_CHUNK_CONCURRENCY);
    const settled = await Promise.allSettled(wave.map(fetchCommunityAdminsChunk));

    settled.forEach((result, waveIndex) => {
      const chunk = wave[waveIndex];
      if (result.status === "fulfilled") {
        result.value.forEach((item) => {
          adminsById.set(item.id, item);
        });
        return;
      }

      // A chunk timed out or errored (e.g. a community on a dead RPC chain).
      // Surface it for observability, then mark its communities unavailable so
      // the rest of the page still renders.
      errorManager("Community admins batch chunk failed", result.reason, {
        context: "admin.community.batch-admins.chunk",
        communityCount: chunk.length,
      });
      chunk.forEach((uid) => {
        if (!adminsById.has(uid)) {
          adminsById.set(uid, { id: uid, admins: [], status: "subgraph_unavailable" });
        }
      });
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
};
