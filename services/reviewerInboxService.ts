import type { IApplicationFilters } from "@/services/fundingPlatformService";
import type { IReviewerInboxResponse } from "@/types/funding-platform";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import { buildApplicationQueryParams } from "./fundingApplicationParams";

/**
 * Get the reviewer inbox: a unified, server-merged feed of the caller's
 * pending application reviews and milestone verifications across every
 * program in a community. The indexer buckets, sorts and paginates
 * server-side. Admins may pass `reviewerAddress` to view another reviewer's
 * queue. No `programId` — the endpoint spans the whole community.
 */
export async function getReviewerInbox(
  communityId: string,
  filters: IApplicationFilters = {}
): Promise<IReviewerInboxResponse> {
  const params = buildApplicationQueryParams(filters);
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.reviewerAddress) params.append("reviewerAddress", filters.reviewerAddress);

  // TODO(#1775): add zod schema
  const data = await api.get<IReviewerInboxResponse>(
    INDEXER.V2.FUNDING_APPLICATIONS.REVIEWER_INBOX(communityId, params.toString())
  );

  if (!data) {
    throw new Error("Failed to fetch reviewer inbox");
  }

  return {
    items: data.items ?? [],
    pagination: data.pagination ?? {
      page: filters.page || 1,
      limit: filters.limit || 25,
      total: 0,
      totalPages: 0,
    },
    stats: data.stats ?? {
      action: 0,
      waiting: 0,
      done: 0,
      overdue: 0,
      applications: 0,
      milestones: 0,
    },
  };
}
