/**
 * Structural identification of karma-gap-sdk's attestation error wrapper.
 *
 * Lives in its own dependency-free module because both the Sentry reporting
 * policy (`utilities/sentry/attestationFailure.ts`) and the transient-error
 * filters (`utilities/sentry/transientErrors.ts`, which is also loaded by the
 * server and edge Sentry configs) need it, and neither should pull the other's
 * dependencies in.
 */

/**
 * True when the value is karma-gap-sdk's `SchemaError` / `AttestationError`.
 *
 * The SDK sets a NUMERIC `code` (`SchemaErrorCodes.ATTEST_ERROR` is `50012`)
 * alongside an `originalError`. ethers uses a STRING `code` (`"UNKNOWN_ERROR"`,
 * `"CALL_EXCEPTION"`, ...), so the two never collide.
 *
 * Structural on purpose. The SDK's message is the constant
 * `"Error during attestation."` today; if it ever carries the underlying cause
 * instead, message-based checks silently change behaviour and this one does not.
 */
export function isAttestationWrapperError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, originalError } = error as { code?: unknown; originalError?: unknown };
  return typeof code === "number" && originalError !== undefined;
}
