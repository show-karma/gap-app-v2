import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

export const COMMUNITY_INDEX_POLL_ATTEMPTS = 12;
export const COMMUNITY_INDEX_POLL_DELAY_MS = 2500;

// After an on-chain community create returns `status: "pending"` (BE PR #2232),
// the community is attested but not yet indexed. Poll the read endpoint until it
// appears so we don't navigate to a not-yet-indexed page. Resolves true once found,
// false if it never appears within the window (caller navigates anyway).
export const waitForCommunityIndexed = async (idOrSlug: string): Promise<boolean> => {
  for (let attempt = 0; attempt < COMMUNITY_INDEX_POLL_ATTEMPTS; attempt++) {
    try {
      // TODO(#1775): add zod schema
      const community = await api.get<{ uid?: string }>(INDEXER.COMMUNITY.V2.GET(idOrSlug));
      if (community?.uid) return true;
    } catch {
      // SUPPRESSED: 404/transient while the community is still being indexed —
      // that is the very state this helper polls through; keep waiting.
    }
    await new Promise((resolve) => setTimeout(resolve, COMMUNITY_INDEX_POLL_DELAY_MS));
  }
  return false;
};
