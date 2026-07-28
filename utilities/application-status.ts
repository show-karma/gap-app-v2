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

const STATUS_UPDATE_FALLBACK_MESSAGE = "Failed to update application status";

export const STATUS_CONFLICT_MESSAGE =
  "This application's status was already changed — refreshing.";

/**
 * The backend answers 409 when the requested transition is no longer valid for
 * the application's current status (e.g. approving an already-approved one).
 * That's a stale-UI conflict, not a retryable failure.
 */
export function isStatusConflictError(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null | undefined)?.response?.status === 409;
}

export function getStatusUpdateErrorMessage(error: unknown): string {
  if (isStatusConflictError(error)) return STATUS_CONFLICT_MESSAGE;
  const message = (error as { response?: { data?: { message?: string } } } | null | undefined)
    ?.response?.data?.message;
  return message || STATUS_UPDATE_FALLBACK_MESSAGE;
}

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
