const APPLICATION_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  resubmitted: "Resubmitted",
  under_review: "Under Review",
  revision_requested: "Revision Requested",
  approved: "Approved",
  accepted: "Accepted",
  rejected: "Declined",
  canceled: "Cancelled",
  cancelled: "Cancelled",
  submitted: "Submitted",
};

export function formatApplicationStatus(status: string): string {
  const normalized = status.toLowerCase().replace(/-/g, "_");

  return (
    APPLICATION_STATUS_LABELS[normalized] ??
    normalized
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}
