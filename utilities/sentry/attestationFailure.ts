import * as Sentry from "@sentry/nextjs";
import { isAttestationWrapperError } from "@/utilities/attestation/errorShape";
import { isAttestRetryExhaustedError } from "@/utilities/attestWithRetry";
import {
  detectInjectedProviderConflict,
  isProviderConflictError,
} from "@/utilities/wallet/providerConflict";

/**
 * Centralised Sentry policy for attestation failures — the counterpart to
 * `utilities/api/report.ts` for the ~40 flows that write on-chain.
 *
 * Why this exists: karma-gap-sdk's `Attestation.attest` catches EVERYTHING and
 * rethrows `AttestationError("ATTEST_ERROR", "Error during attestation.")`.
 * That message is a constant, so Sentry groups every attestation failure in the
 * app by stack shape alone. In practice that produced buckets holding several
 * unrelated bugs at once: GAP-FRONTEND-23J mixed a duelling-wallet-extension
 * stack overflow with an ERC-4337 UserOperation rejection, and its sibling
 * GAP-FRONTEND-20C spans project creation, the funding map and grant
 * applications in a single row. The underlying cause survives on
 * `.originalError`, but nothing read it.
 *
 * So: classify structurally, fingerprint on the classification, and put the
 * things a triager actually needs (wallet, chain, entity, RPC method) on tags
 * rather than buried in `extra`.
 *
 * Deliberately NOT keyed off message wording anywhere. The SDK's message is a
 * constant today and may carry the cause tomorrow; either way the structure of
 * the wrapper is stable.
 */

export type AttestFailureKind =
  /** Duelling injected wallet extensions blew the JS stack. Deterministic. */
  | "wallet-provider-conflict"
  /** Every send attempt timed out and nothing landed on-chain. */
  | "retry-exhausted"
  /** ERC-4337 bundler / UserOperation rejection on the gasless path. */
  | "gasless-userop"
  /** The chain reverted, or the wallet reported insufficient funds. */
  | "chain-rejected"
  /** Wrapped by the SDK, but we could not narrow it any further. */
  | "unclassified";

export interface AttestationFailure {
  kind: AttestFailureKind;
  /** Whether resending could plausibly succeed. */
  retriable: boolean;
  /** The JSON-RPC method that failed, when the error carries an ethers payload. */
  rpcMethod?: string;
  /** Deepest human-readable message we can reach, for `extra`. */
  causeMessage: string;
}

export interface AttestationContext {
  /** SDK entity being attested, e.g. `ProjectUpdate`. Used in the fingerprint. */
  entity: string;
  chainId?: number;
  /** `embedded` (gasless) or `external` (user-signed). */
  signingMode?: string;
  /** Privy's `walletClientType`, e.g. `metamask` / `leap` / `walletconnect`. */
  walletClientType?: string;
}

/** True for anything this module is responsible for reporting. */
export function isAttestationFailure(error: unknown): boolean {
  return (
    isAttestationWrapperError(error) ||
    isAttestRetryExhaustedError(error) ||
    isProviderConflictError(error)
  );
}

function unwrap(error: unknown): unknown[] {
  if (!error || typeof error !== "object") return [];
  const {
    cause,
    originalError,
    error: inner,
  } = error as {
    cause?: unknown;
    originalError?: unknown;
    error?: unknown;
  };
  return [cause, originalError, inner].filter((value) => value !== undefined);
}

function collectMessages(error: unknown, depth = 0): string[] {
  if (!error || depth > 5) return [];
  const own =
    typeof error === "string"
      ? error
      : typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";
  return [own, ...unwrap(error).flatMap((nested) => collectMessages(nested, depth + 1))].filter(
    Boolean
  );
}

/**
 * The SDK wrapper's message is a constant, so the useful text is always
 * further down the chain. Return the deepest non-empty message.
 */
function deepestMessage(error: unknown): string {
  const messages = collectMessages(error);
  return messages[messages.length - 1] ?? "";
}

/**
 * ethers serialises the failed request into its message as
 * `payload={ ... "method": "eth_sendTransaction" ... }`. Recovering the method
 * separates "the wallet refused to sign" from "a read failed", which the
 * message alone does not.
 */
function extractRpcMethod(error: unknown): string | undefined {
  const haystack = collectMessages(error).join(" ");
  // Digits are part of real method names (`eth_signTypedData_v4`), so the
  // character class must include them.
  return /"method"\s*:\s*"([a-zA-Z0-9_]+)"/.exec(haystack)?.[1];
}

const GASLESS_FRAGMENTS = ["user operation", "useroperation", "bundler", "paymaster"];
const CHAIN_REJECTED_FRAGMENTS = [
  "insufficient funds",
  "execution reverted",
  "call_exception",
  "transaction reverted",
];

function matchesAny(haystack: string, fragments: readonly string[]): boolean {
  return fragments.some((fragment) => haystack.includes(fragment));
}

/**
 * Classifies an attestation failure. Order matters: the structural checks run
 * before any text matching, so a conflict or an exhausted retry is never
 * mistaken for something softer.
 */
export function classifyAttestationFailure(error: unknown): AttestationFailure {
  const causeMessage = deepestMessage(error);
  const rpcMethod = extractRpcMethod(error);
  const base = { causeMessage, rpcMethod };

  // Deterministic: the user in GAP-FRONTEND-23J retried by hand 45s later and
  // failed identically. Never retriable.
  if (isProviderConflictError(error)) {
    return { ...base, kind: "wallet-provider-conflict", retriable: false };
  }

  if (isAttestRetryExhaustedError(error)) {
    return { ...base, kind: "retry-exhausted", retriable: false };
  }

  const haystack = collectMessages(error).join(" ").toLowerCase();

  if (matchesAny(haystack, GASLESS_FRAGMENTS)) {
    return { ...base, kind: "gasless-userop", retriable: false };
  }

  if (matchesAny(haystack, CHAIN_REJECTED_FRAGMENTS)) {
    return { ...base, kind: "chain-rejected", retriable: false };
  }

  return { ...base, kind: "unclassified", retriable: true };
}

/**
 * Reports an attestation failure with a fingerprint and tags that make the
 * issue triageable without opening an event.
 *
 * Titles read `Attestation failed (ProjectUpdate) — wallet-provider-conflict`
 * instead of the constant `ATTEST_ERROR: Error during attestation.`, and
 * `attest.kind` becomes alertable: a spike in `gasless-userop` is a bundler
 * incident, a spike in `wallet-provider-conflict` is not.
 *
 * The original exception is still what gets captured — only the grouping and
 * the tags are ours.
 */
export function reportAttestationFailure(
  error: unknown,
  opts: {
    context: AttestationContext;
    errorMessage?: string;
    extra?: Record<string, unknown>;
  }
): AttestationFailure {
  const failure = classifyAttestationFailure(error);
  const { context } = opts;

  const conflict =
    failure.kind === "wallet-provider-conflict" ? detectInjectedProviderConflict() : null;

  Sentry.captureException(error, {
    level: "error",
    fingerprint: ["attestation", context.entity, failure.kind],
    tags: {
      "attest.kind": failure.kind,
      "attest.entity": context.entity,
      ...(context.chainId !== undefined && { "attest.chain_id": String(context.chainId) }),
      ...(context.signingMode && { "attest.signing_mode": context.signingMode }),
      ...(context.walletClientType && { "attest.wallet": context.walletClientType }),
      ...(failure.rpcMethod && { "attest.rpc_method": failure.rpcMethod }),
    },
    extra: {
      ...opts.extra,
      ...(opts.errorMessage && { errorMessage: opts.errorMessage }),
      // The SDK's constant message hides this. It is the single most useful
      // field on the event.
      attestCauseMessage: failure.causeMessage,
      ...(conflict && { injectedWallets: conflict.names, injectedWalletCount: conflict.count }),
    },
  });

  return failure;
}
