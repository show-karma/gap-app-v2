import { HttpError, isApiError } from "@/utilities/api/errors";
import { isMissingMilestoneRecipientError } from "@/utilities/milestones/attestationIdentity";
import { isRetryConditionNotMetError } from "@/utilities/retries";
import { isTransientHttpError, isTransientNetworkError } from "@/utilities/sentry/transientErrors";
import { isSignerUnavailableError } from "@/utilities/wallet/signerReadiness";

/**
 * Where in the milestone attestation flow a failure happened. Attached to the
 * Sentry context so an incident can be located without guessing which of the
 * ~10 failure classes collapsed into the toast.
 */
export type MilestoneFlowStep = "setup" | "fetch" | "backend" | "attest" | "poll";

export type MilestoneFailureKind =
  | "signer-unavailable"
  | "network-switch"
  | "missing-recipient"
  | "indexing-timeout"
  | "insufficient-funds"
  | "wallet-rpc"
  | "network"
  | "server"
  | "unknown";

export interface MilestoneFailureDescription {
  kind: MilestoneFailureKind;
  /** Full user-facing toast text, naming the cause rather than just the action. */
  message: string;
  /**
   * Expected user/lifecycle state (e.g. a wallet that hasn't hydrated yet).
   * Guidance, not a defect — callers must skip Sentry reporting for these.
   * A poll that exhausts AFTER a transaction was submitted is deliberately
   * NOT expected: it can mean the write never landed.
   */
  expected: boolean;
}

export type MilestoneAction = "verify" | "complete";

const ACTION_LABEL: Record<MilestoneAction, string> = {
  verify: "Failed to verify milestone",
  complete: "Failed to complete milestone",
};

const errorText = (error: unknown): string => {
  const candidate = error as
    | { message?: unknown; code?: unknown; originalError?: { message?: unknown; code?: unknown } }
    | null
    | undefined;
  return [
    candidate?.message,
    candidate?.code,
    candidate?.originalError?.message,
    candidate?.originalError?.code,
  ]
    .map((value) => (value == null ? "" : String(value)))
    .join(" ")
    .toLowerCase();
};

const isNetworkSwitchFailure = (text: string): boolean =>
  text.includes("switch chain") ||
  text.includes("network changed") ||
  text.includes("switch to the required network") ||
  text.includes("still on chain");

/**
 * Maps a milestone attestation failure onto a concise, user-appropriate cause.
 *
 * Every branch here used to collapse into a bare "Failed to verify milestone",
 * which told the user nothing and told us nothing either. User rejections are
 * NOT handled here — callers detect them with `isUserRejectionError` and show
 * their own "cancelled" copy.
 */
export const describeMilestoneFailure = (
  error: unknown,
  action: MilestoneAction
): MilestoneFailureDescription => {
  const label = ACTION_LABEL[action];

  if (isSignerUnavailableError(error)) {
    return { kind: "signer-unavailable", message: error.message, expected: true };
  }

  if (isMissingMilestoneRecipientError(error)) {
    return { kind: "missing-recipient", message: error.message, expected: false };
  }

  // Poll exhaustion after a submitted transaction. It is NOT `expected`: the
  // same symptom covers benign indexer lag AND an attestation the indexer
  // admitted and then skipped (e.g. a cancelled milestone), which never
  // appears at all. Suppressing it made that second case invisible in both
  // directions, so the copy stops promising the write will land and the
  // classification lets it reach Sentry.
  if (isRetryConditionNotMetError(error)) {
    return {
      kind: "indexing-timeout",
      message:
        action === "verify"
          ? "Your verification was submitted on-chain and is still being indexed. If it doesn't appear after a few minutes, contact support before verifying again."
          : "Your completion was submitted on-chain and is still being indexed. If it doesn't appear after a few minutes, contact support before completing again.",
      expected: false,
    };
  }

  const text = errorText(error);

  if (isNetworkSwitchFailure(text)) {
    return {
      kind: "network-switch",
      message: `${label}: couldn't switch your wallet to the required network.`,
      expected: false,
    };
  }

  if (text.includes("insufficient funds")) {
    return {
      kind: "insufficient-funds",
      message: `${label}: your wallet doesn't have enough funds to cover gas.`,
      expected: false,
    };
  }

  if (error instanceof HttpError) {
    return {
      kind: "server",
      message: `${label}: the server rejected the request (HTTP ${error.status}).`,
      expected: false,
    };
  }

  if (isApiError(error) && error.kind === "contract") {
    return {
      kind: "server",
      message: `${label}: the server returned an unexpected response.`,
      expected: false,
    };
  }

  if (isTransientNetworkError(error) || isTransientHttpError(error) || isApiError(error)) {
    return {
      kind: "network",
      message: `${label}: a network request failed. Check your connection and try again.`,
      expected: false,
    };
  }

  if (text.includes("rpc error") || text.includes("could not coalesce")) {
    return {
      kind: "wallet-rpc",
      message: `${label}: your wallet's network didn't respond. Try again shortly.`,
      expected: false,
    };
  }

  return {
    kind: "unknown",
    message: `${label}: an unexpected error occurred.`,
    expected: false,
  };
};
