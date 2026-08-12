"use client";

import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";

/**
 * Tri-state-plus authority for submitting a milestone completion:
 *
 * - "not-applicant": viewer isn't the applicant — no affordance, no notice.
 * - "resolving": lookup in flight — render a skeleton, never the affordance.
 * - "authorized": both signals held — submission allowed.
 * - "denied": lookup resolved and the applicant has no project authority.
 * - "unverified": authority is unknowable (no linked project, or the lookup
 *   failed) — blocked, but NOT a denial; `retry` re-runs the lookup.
 */
// Not exported: consumers switch on the inferred return type, and an exported
// type with no importers registers as dead surface in the quality gate.
type MilestoneSubmissionAuthority =
  | { status: "not-applicant" }
  | { status: "resolving" }
  | { status: "authorized" }
  | { status: "denied" }
  | { status: "unverified"; retry: () => void };

interface UseMilestoneSubmissionAuthorityInput {
  /** Off-chain funding-platform applicant role (the application's `isOwner`). */
  isApplicant: boolean;
  /** UID of the Karma project the application is linked to, if any. */
  projectUID?: string;
}

/**
 * Being the APPLICANT is an off-chain role; the indexer authorizes the
 * resulting on-chain attestation against PROJECT authority (owner / MemberOf /
 * on-chain admin, resolved server-side across every linked wallet — a
 * client-side address comparison would miss the other wallets). Without both
 * signals EAS accepts the attestation, the grantee pays gas, and the indexer
 * silently discards it.
 */
export function useMilestoneSubmissionAuthority({
  isApplicant,
  projectUID,
}: UseMilestoneSubmissionAuthorityInput): MilestoneSubmissionAuthority {
  const canResolve = isApplicant && Boolean(projectUID);
  const { data, isPending, isPlaceholderData, isError, refetch } = usePermissionsQuery(
    { projectId: projectUID },
    { enabled: canResolve }
  );

  if (!isApplicant) return { status: "not-applicant" };

  const retry = () => {
    void refetch();
  };

  // No linked project → authority is unknowable. Checked before the query
  // state: a disabled v5 query reports isPending=true forever, which must not
  // read as "still loading".
  if (!canResolve) return { status: "unverified", retry };

  // Fail closed while undecided. NOT `isLoading` (false on a disabled query),
  // and `placeholderData: keepPreviousData` serves the PREVIOUS project's
  // permissions under status "success" — trusting either flashes the submit
  // affordance for a project the applicant has no authority on.
  if (isPending || isPlaceholderData) return { status: "resolving" };

  // Checked before `data`: on a background refetch failure React Query keeps
  // the last-good payload, so an errored lookup must not read as authorized
  // off stale permissions.
  if (isError) return { status: "unverified", retry };

  const hasProjectAuthority =
    data?.isProjectOwner === true ||
    data?.isProjectAdmin === true ||
    data?.isProjectMember === true;

  return hasProjectAuthority ? { status: "authorized" } : { status: "denied" };
}
