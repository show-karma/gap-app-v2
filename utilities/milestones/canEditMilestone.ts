import type { UnifiedMilestone } from "@/types/v2/roadmap";

/**
 * Whether the connected wallet can edit or revoke `milestone` on-chain.
 *
 * Mirrors the gate in `Gap.sol::_multiRevoke`:
 *   revoker == owner() || target.attester == revoker || target.recipient == revoker
 *
 * The `isContractOwner` flag covers the `owner()` branch (Karma's super-admin
 * wallet, surfaced by `useOwnerStore.isOwner`); the two address comparisons
 * cover the per-attestation attester/recipient branches. `Project.isOwner`
 * and `Project.isAdmin` from the SDK are deliberately permissive on-chain
 * and do NOT match this gate — do not use them here.
 */
export const canEditMilestone = (
  milestone: UnifiedMilestone | null | undefined,
  connectedAddress: string | null | undefined,
  isContractOwner: boolean
): boolean => {
  if (isContractOwner) return true;
  if (!milestone || !connectedAddress) return false;

  const me = connectedAddress.toLowerCase();
  const grantMilestone = milestone.source?.grantMilestone?.milestone;
  const projectMilestone = milestone.source?.projectMilestone;
  // Includes both the creation attestation (Edit / dropdown menu) and the
  // completion attestation (Revoke Completion) — Gap.sol::_multiRevoke
  // checks the *target* attestation's own attester/recipient.
  const candidates = [
    grantMilestone?.recipient,
    grantMilestone?.attester,
    grantMilestone?.completed?.attester,
    projectMilestone?.recipient,
    projectMilestone?.attester,
    projectMilestone?.completed?.attester,
  ];

  return candidates.some((addr) => addr?.toLowerCase() === me);
};
