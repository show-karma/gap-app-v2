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
 * Strict path: the indexed attester matches one of our candidate addresses.
 * Tolerant path: the indexer has not resolved an attester yet, but the
 * verification attestation is a different one from what we saw before signing.
 */
export const matchesSubmittedVerification = ({
  verificationDetails,
  candidates,
  previousAttestationUID,
}: VerificationMatchInput): boolean => {
  if (!verificationDetails) return false;

  const verifiedBy = verificationDetails.verifiedBy?.toLowerCase();
  if (verifiedBy) {
    return candidates.includes(verifiedBy);
  }

  const attestationUID = verificationDetails.attestationUID;
  return !!attestationUID && attestationUID !== previousAttestationUID;
};
