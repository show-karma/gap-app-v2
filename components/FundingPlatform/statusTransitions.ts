import type { FundingApplicationStatusV2 } from "@/types/funding-platform";

/**
 * Single source of truth for which status transitions an application allows.
 * The action-button surfaces (header, detail card, table row) keep their own
 * labels/styles/permissions but must agree on this adjacency, and the
 * pre-flight staleness check validates against it before sending a PUT.
 */
const ALLOWED_STATUS_TRANSITIONS: Record<
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

// Set-backed mirror of the adjacency for constant-time checks in render loops.
const ALLOWED_TARGET_SETS = new Map<string, ReadonlySet<FundingApplicationStatusV2>>(
  Object.entries(ALLOWED_STATUS_TRANSITIONS).map(([from, targets]) => [from, new Set(targets)])
);

export const isAllowedStatusTransition = (
  currentStatus: string | null | undefined,
  targetStatus: string
): boolean =>
  !!currentStatus &&
  (ALLOWED_TARGET_SETS.get(currentStatus.toLowerCase())?.has(
    targetStatus.toLowerCase() as FundingApplicationStatusV2
  ) ??
    false);
