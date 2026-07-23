import { api } from "../api/client";
import { INDEXER } from "../indexer";

// TODO(#1775): add zod schema — endpoint shape is otherwise untyped.
interface CommunityStatsResponse {
  projects?: number;
  [key: string]: unknown;
}

export const getTotalProjects = async (communityId: string) => {
  try {
    const data = await api.get<CommunityStatsResponse>(INDEXER.COMMUNITY.STATS(communityId), {
      isAuthorized: false,
    });
    if (!data.projects) return 0;
    return data.projects;
  } catch {
    // SUPPRESSED: best-effort community project count for a header widget;
    // degrade to 0 rather than blocking the UI (matches legacy behavior).
    return 0;
  }
};
