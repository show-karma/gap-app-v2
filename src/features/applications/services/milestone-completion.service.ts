import type { GrantMilestoneWithDetails } from "@/types/v2/roadmap";
import fetchData from "@/utilities/fetchData";

/**
 * Fetches the rich on-chain milestone payload (canAttest flags, grant
 * info, completion/verification details) by milestoneUID + chainID.
 *
 * Used by the application detail page when only the milestoneUID is
 * known (from `milestoneStatuses[]`) and the full
 * `GrantMilestoneWithDetails` isn't already wired in via a parent
 * (e.g. the project page passes it directly).
 *
 * Throws when the indexer returns an error or null body so callers can
 * surface a single toast at the orchestration layer.
 */
export async function fetchGrantMilestoneByUID(
  milestoneUID: string,
  chainID: number
): Promise<GrantMilestoneWithDetails> {
  const [data, error] = await fetchData<GrantMilestoneWithDetails>(
    `/v2/milestones/${milestoneUID}?chainId=${chainID}`,
    "GET"
  );
  if (error || !data) {
    throw new Error(error || "Milestone not found");
  }
  return data;
}
