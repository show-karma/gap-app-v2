import type { TNetwork } from "@show-karma/karma-gap-sdk";
import { chainIdToNetwork, Networks } from "@show-karma/karma-gap-sdk/core/consts";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

/**
 * Structural check for an EVM address. Deliberately NOT viem's `isAddress`,
 * which validates the EIP-55 checksum by default and therefore rejects the
 * all-lowercase addresses the indexer stores.
 */
export const isEvmAddress = (value: string | null | undefined): value is `0x${string}` =>
  !!value && EVM_ADDRESS_PATTERN.test(value);

/**
 * Thrown before any transaction when the milestone the user is acting on has
 * no indexed on-chain recipient.
 *
 * The recipient is part of the attested payload, so it can never be guessed
 * from the project owner or payout address — substituting one would change the
 * attested value. Legacy rows predating the indexer's recipient backfill are
 * the only realistic source, and the correct answer is to stop, not to attest
 * something different.
 */
export class MissingMilestoneRecipientError extends Error {
  readonly name = "MissingMilestoneRecipientError";
  constructor(public readonly milestoneUID: string) {
    super(
      "This milestone is missing its on-chain recipient, so it can't be attested. Please refresh; if it persists, contact support."
    );
  }
}

export const isMissingMilestoneRecipientError = (
  error: unknown
): error is MissingMilestoneRecipientError =>
  !!error &&
  typeof error === "object" &&
  (error as { name?: unknown }).name === "MissingMilestoneRecipientError";

/**
 * Reads the milestone's on-chain recipient from V2 data, or throws before any
 * wallet interaction. Callers must run this BEFORE submitting a transaction.
 */
export const requireMilestoneRecipient = (
  milestone: Pick<GrantMilestoneWithCompletion, "uid" | "recipient">
): `0x${string}` => {
  if (!isEvmAddress(milestone.recipient)) {
    throw new MissingMilestoneRecipientError(milestone.uid);
  }
  return milestone.recipient;
};

/**
 * The MultiAttester ("multicall") contract for a chain, lower-cased, or null
 * for a chain the SDK does not support.
 *
 * `GapContract.multiAttest` — the flow's only live attestation path, since the
 * app sets no gelatoOpts and the EAS-direct path was removed — routes through
 * `GAP.getMulticall(signer).multiSequentialAttest`. That contract is therefore
 * `msg.sender` at EAS, so the indexer records IT as `verifiedBy`, never the
 * user's wallet. Resolved from the SDK per chain rather than hardcoded so a new
 * network needs no change here.
 */
export const getMultiAttesterAddress = (
  chainId: number | string | null | undefined
): string | null => {
  const id = typeof chainId === "string" ? Number(chainId) : chainId;
  if (typeof id !== "number" || !Number.isFinite(id)) return null;

  const network = chainIdToNetwork[id as keyof typeof chainIdToNetwork] as TNetwork | undefined;
  const multicall = network ? Networks[network]?.contracts?.multicall : undefined;

  return isEvmAddress(multicall) ? multicall.toLowerCase() : null;
};

/**
 * Builds the lower-cased set of addresses that may legitimately appear as the
 * attester of an attestation this session just submitted.
 *
 * The signer is Privy-resolved (embedded wallet preferred), while wagmi's
 * `useAccount().address` tracks the first *linked connected* wallet — for a
 * hybrid account (email login + a linked external wallet connected) the two are
 * deterministically different. Matching the poll on wagmi's address therefore
 * never succeeds and turns an on-chain success into a five-minute wait followed
 * by a false failure. Including every linked address keeps the match tolerant of
 * Privy surfacing a different wallet as active mid-flight.
 */
export const buildAttesterCandidates = (addresses: Array<string | null | undefined>): string[] => [
  ...new Set(
    addresses
      .filter((address): address is string => !!address)
      .map((address) => address.toLowerCase())
  ),
];

interface VerificationMatchInput {
  /** The indexed verification, or null/undefined while it is still absent. */
  verificationDetails: { verifiedBy?: string | null; attestationUID?: string } | null | undefined;
  /** Addresses that may have attested (see `buildAttesterCandidates`). */
  candidates: string[];
  /**
   * The verification attestation UID observed BEFORE submitting, if any. Lets
   * the tolerant branch tell "a new verification landed" apart from "this
   * milestone was already verified by somebody else".
   */
  previousAttestationUID?: string;
}

/**
 * True once the indexer shows a verification that this session plausibly
 * created.
 *
 * Strict path: the indexed attester matches one of our candidate addresses
 * (the signer, its linked wallets, or the chain's MultiAttester contract).
 * Tolerant path: the attester is unresolved OR unrecognised, but the
 * verification attestation is a different one from what we saw before signing
 * — a UID that changed under a transaction we just sent is ours regardless of
 * who the indexer attributes it to. The snapshot guard keeps a pre-existing
 * verification (unchanged UID) from ever satisfying this branch.
 */
export const matchesSubmittedVerification = ({
  verificationDetails,
  candidates,
  previousAttestationUID,
}: VerificationMatchInput): boolean => {
  if (!verificationDetails) return false;

  const verifiedBy = verificationDetails.verifiedBy?.toLowerCase();
  if (verifiedBy && candidates.includes(verifiedBy)) return true;

  const attestationUID = verificationDetails.attestationUID;
  return !!attestationUID && attestationUID !== previousAttestationUID;
};
