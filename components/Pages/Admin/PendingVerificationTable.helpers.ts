export function getEmptyStateMessage(
  selectedReviewerAddress?: string,
  currentUserAddress?: string
): string {
  if (
    selectedReviewerAddress &&
    currentUserAddress &&
    selectedReviewerAddress.toLowerCase() === currentUserAddress.toLowerCase()
  ) {
    return "All your assigned milestones are verified";
  }
  if (selectedReviewerAddress) {
    return "All milestones assigned to this reviewer are verified";
  }
  return "All milestones are verified";
}
