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
  const candidates = [
    milestone.source?.grantMilestone?.milestone?.recipient,
    milestone.source?.grantMilestone?.milestone?.attester,
    milestone.source?.projectMilestone?.recipient,
    milestone.source?.projectMilestone?.attester,
  ];

  return candidates.some((addr) => addr?.toLowerCase() === me);
};
