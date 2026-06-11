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
