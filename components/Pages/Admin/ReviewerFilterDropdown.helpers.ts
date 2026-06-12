import type { CommunityReviewer } from "@/hooks/useCommunityMilestoneReviewers";
import { formatAddressForDisplay } from "@/utilities/donations/helpers";

export function getReviewerLabel(reviewer: CommunityReviewer, currentUserAddress?: string): string {
  const name = reviewer.name || formatAddressForDisplay(reviewer.publicAddress);
  if (
    currentUserAddress &&
    reviewer.publicAddress.toLowerCase() === currentUserAddress.toLowerCase()
  ) {
    return `${name} (You)`;
  }
  return name;
}
