import type { FundingApplicationStatusV2 } from "@/types/funding-platform";

/**
 * Single source of truth for which status transitions an application allows.
 * The action-button surfaces (header, detail card, table row) keep their own
 * labels/styles/permissions but must agree on this adjacency, and the
 * pre-flight staleness check validates against it before sending a PUT.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<
  FundingApplicationStatusV2,
  readonly FundingApplicationStatusV2[]
> = {
  pending: ["under_review"],
  resubmitted: ["under_review"],
  under_review: ["revision_requested", "approved", "rejected"],
  revision_requested: ["under_review"],
  approved: [],
  rejected: [],
};

export const getAllowedStatusTransitions = (
  currentStatus: string | null | undefined
): readonly FundingApplicationStatusV2[] => {
  if (!currentStatus) return [];
  return (
    ALLOWED_STATUS_TRANSITIONS[currentStatus.toLowerCase() as FundingApplicationStatusV2] ?? []
  );
};

export const isAllowedStatusTransition = (
  currentStatus: string | null | undefined,
  targetStatus: string
): boolean =>
  getAllowedStatusTransitions(currentStatus).includes(
    targetStatus.toLowerCase() as FundingApplicationStatusV2
  );
