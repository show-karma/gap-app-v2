import axios from "axios";

/**
 * Narrows an unknown caught value to the most informative human-readable
 * message available, preferring the backend's domain message.
 *
 * Resolution order:
 *   1. Axios error -> `response.data.message` (the API's domain-specific copy),
 *      falling back to the axios `message` (e.g. "Network Error").
 *   2. Any other `Error` -> its `message`.
 *   3. Anything else (string, null, undefined, plain object) -> `fallback`.
 *
 * Used by the funding-application evaluation buttons so every trigger surfaces
 * the same backend error copy instead of re-implementing axios narrowing inline.
 */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

/**
 * Thrown when an eligibility check finds a conflict with an existing enrollment
 * (HTTP 409 from the eligibility API).
 */
export class EligibilityConflictError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message = "Eligibility conflict: the address is already enrolled in a conflicting program",
    code = "ELIGIBILITY_CONFLICT"
  ) {
    super(message);
    this.name = "EligibilityConflictError";
    this.status = 409;
    this.code = code;
  }
}

/**
 * Failure modes of an off-chain attestation revoke (`performOffChainRevoke`).
 *
 * - `API_ERROR`: the server responded with an error status. `fetchData`
 *   surfaces this as a STRING in `res[1]`, so we can attach the HTTP `status`.
 * - `REQUEST_FAILED`: the request never produced a server response — a network
 *   failure or the internal 30s request timeout. `fetchData` surfaces this as a
 *   raw `Error` object in `res[1]`, so there is no meaningful status.
 * - `INDEXING_TIMEOUT`: the revoke was accepted but the post-revoke indexing
 *   poll exhausted its budget before the indexer reflected the change. Modelled
 *   separately by {@link IndexingTimeoutError}.
 */
export type OffChainRevokeErrorCode = "API_ERROR" | "REQUEST_FAILED" | "INDEXING_TIMEOUT";

interface OffChainRevokeErrorContext {
  /** Attestation UID that was being revoked, for telemetry. */
  uid?: string;
  /** Chain the attestation lives on, for telemetry. */
  chainID?: number;
  /** HTTP status when the server responded (API_ERROR only). */
  status?: number;
  /**
   * Whether the user-facing toast for this error has already been shown by the
   * primitive that threw it. Outer catch blocks use {@link isSurfacedError} to
   * avoid stacking a second, generic toast on top of the specific one.
   */
  surfaced?: boolean;
}

/**
 * Thrown by `performOffChainRevoke` when an off-chain attestation revoke fails.
 *
 * The contract is "throw on failure" — failure is no longer encoded as an
 * ignorable boolean. Callers that need to react differently per failure mode
 * branch on `code`; callers that only need to keep a dialog open simply let the
 * rejection propagate.
 */
export class OffChainRevokeError extends Error {
  readonly name = "OffChainRevokeError";
  readonly code: OffChainRevokeErrorCode;
  readonly status?: number;
  readonly uid?: string;
  readonly chainID?: number;
  readonly surfaced: boolean;

  constructor(
    code: OffChainRevokeErrorCode,
    message: string,
    context: OffChainRevokeErrorContext = {}
  ) {
    super(message);
    this.code = code;
    this.status = context.status;
    this.uid = context.uid;
    this.chainID = context.chainID;
    this.surfaced = context.surfaced ?? false;
  }
}

/**
 * Thrown when a revoke was accepted by the API but the indexer had not yet
 * reflected the change before the interactive polling budget ran out. This is
 * a distinct, recoverable state from a rejected revoke — the server state is
 * correct and will appear on the next refetch — so it gets its own actionable
 * message.
 */
export const INDEXING_TIMEOUT_MESSAGE =
  "Your revocation was submitted but is still being indexed. Please refresh in a moment.";

/**
 * Completion counterpart of {@link INDEXING_TIMEOUT_MESSAGE}. Deliberately
 * worded differently: a completion that never lands is NOT always a lagging
 * indexer. The indexer also drops completion attestations whose signing wallet
 * fails its authorization check, and that rejection is invisible to the client
 * — `POST /attestations/index-by-transaction` answers 200 either way. Promising
 * "it will appear shortly" would be a lie in the case that actually matters, so
 * this names the likely cause and gives the user something to act on.
 */
export const COMPLETION_INDEXING_TIMEOUT_MESSAGE =
  "Your completion was signed on-chain but hasn't been indexed yet. Refresh in a moment — if the milestone is still not marked complete, the wallet you signed with may not be authorized for this project.";

export class IndexingTimeoutError extends Error {
  readonly name = "IndexingTimeoutError";
  readonly code = "INDEXING_TIMEOUT" as const;
  readonly uid?: string;
  readonly chainID?: number;
  readonly surfaced: boolean;

  constructor(
    message = INDEXING_TIMEOUT_MESSAGE,
    context: Pick<OffChainRevokeErrorContext, "uid" | "chainID" | "surfaced"> = {}
  ) {
    super(message);
    this.uid = context.uid;
    this.chainID = context.chainID;
    this.surfaced = context.surfaced ?? false;
  }
}

/**
 * Type guard for errors whose user-facing toast has already been shown by the
 * primitive that threw them. Outer catch blocks should skip their generic
 * `showError` / `toast.error` for these (but still report to telemetry) so the
 * user sees one specific message instead of a specific message plus a generic
 * one stacked on top.
 */
export function isSurfacedError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "surfaced" in error &&
    (error as { surfaced?: unknown }).surfaced === true
  );
}

/**
 * Mark an error as surfaced after its user-facing toast has been shown, so
 * outer catch blocks (see {@link isSurfacedError}) skip their generic toast
 * instead of stacking it on top of the specific one. Returns the same error
 * so it can be rethrown inline. No-op for non-object errors, which cannot
 * carry the flag.
 */
export function markSurfaced<T>(error: T): T {
  if (error && typeof error === "object") {
    (error as { surfaced?: boolean }).surfaced = true;
  }
  return error;
}
