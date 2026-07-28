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

/** Shared toast id so repeated conflicts collapse into a single notification. */
export const STATUS_CONFLICT_TOAST_ID = "application-status-conflict";

/**
 * The backend maps its whole funding-application validation family to 409, so
 * the status code alone can't tell a stale-status conflict from a correctable
 * input error (currency mismatch, bad approved amount, missing reason) raised by
 * the same endpoint. Only the transition failure is unrecoverable for the open
 * form, and it is the only one carrying this message.
 */
const TRANSITION_CONFLICT_PATTERN = /invalid status transition/i;

const getResponseStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } } | null | undefined)?.response?.status;

const getResponseMessage = (error: unknown): string | undefined =>
  (error as { response?: { data?: { message?: string } } } | null | undefined)?.response?.data
    ?.message;

/**
 * True only when the requested transition is no longer valid for the
 * application's current status (e.g. approving an already-approved one). That's
 * a stale-UI conflict, not a retryable failure.
 */
export function isStatusConflictError(error: unknown): boolean {
  return (
    getResponseStatus(error) === 409 &&
    TRANSITION_CONFLICT_PATTERN.test(getResponseMessage(error) ?? "")
  );
}

export function getStatusUpdateErrorMessage(error: unknown): string {
  if (isStatusConflictError(error)) return STATUS_CONFLICT_MESSAGE;
  return getResponseMessage(error) || STATUS_UPDATE_FALLBACK_MESSAGE;
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
