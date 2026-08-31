import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import type {
  CommunityReviewerProgramsResponse,
  CommunityReviewersResponse,
  FetchCommunityReviewersParams,
} from "./community-reviewers.types";

/**
 * Fetch the community-scoped reviewer pool.
 * Uses the typed `api` client which attaches Bearer JWT automatically.
 */
export async function fetchCommunityReviewers(
  communityUID: string,
  params: FetchCommunityReviewersParams = {}
): Promise<CommunityReviewersResponse> {
  const queryParams = new URLSearchParams();
  if (params.programId) queryParams.set("programId", params.programId);
  if (params.search) queryParams.set("search", params.search);
  if (params.cursor) queryParams.set("cursor", params.cursor);
  if (params.limit !== undefined) queryParams.set("limit", String(params.limit));

  const query = queryParams.toString();
  const endpoint = `${INDEXER.V2.COMMUNITIES.REVIEWERS(communityUID)}${query ? `?${query}` : ""}`;

  // TODO(#1775): add zod schema
  const data = await api.get<CommunityReviewersResponse>(endpoint);

  return data ?? { items: [], nextCursor: null };
}

export async function fetchCommunityReviewerPrograms(
  communityUID: string
): Promise<CommunityReviewerProgramsResponse> {
  const endpoint = INDEXER.V2.COMMUNITIES.REVIEWER_PROGRAMS(communityUID);
  // TODO(#1775): add zod schema
  const data = await api.get<CommunityReviewerProgramsResponse>(endpoint);
  return data ?? { items: [] };
}
