import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const COMMUNITY_INDEX_POLL_ATTEMPTS = 12;
export const COMMUNITY_INDEX_POLL_DELAY_MS = 2500;

// After an on-chain community create returns `status: "pending"` (BE PR #2232),
// the community is attested but not yet indexed. Poll the read endpoint until it
// appears so we don't navigate to a not-yet-indexed page. Resolves true once found,
// false if it never appears within the window (caller navigates anyway).
export const waitForCommunityIndexed = async (idOrSlug: string): Promise<boolean> => {
  for (let attempt = 0; attempt < COMMUNITY_INDEX_POLL_ATTEMPTS; attempt++) {
    const [community] = await fetchData(INDEXER.COMMUNITY.V2.GET(idOrSlug), "GET");
    if (community?.uid) return true;
    await new Promise((resolve) => setTimeout(resolve, COMMUNITY_INDEX_POLL_DELAY_MS));
  }
  return false;
};
