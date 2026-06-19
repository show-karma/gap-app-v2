/**
 * Detects signer/attestation failures that are transient chain-switch or
 * bundler-RPC hiccups the user can recover from by simply retrying — as opposed
 * to a real, persistent error.
 *
 * Project creation for email/embedded-wallet users (GAP-FRONTEND-23C) can fail
 * when the gasless RPC blips and the embedded wallet hasn't finished switching
 * networks. Those failures bubble up as wrapped `Error`s whose messages contain
 * recognisable phrases ("still on chain 1", "try again in a moment", the wrapped
 * "Failed to obtain signer from embedded wallet", or low-level ethers/RPC text).
 * When we see one we show an actionable "try again" toast instead of the generic
 * failure message, since the user's form data is preserved and a retry usually
 * succeeds once the network/RPC settles.
 */
const RETRYABLE_ERROR_PATTERNS = [
  "try again in a moment",
  "still on chain",
  "failed to obtain signer",
  "could not coalesce",
  "failed to detect network",
  "network changed",
] as const;

export function isRetryableChainError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  if (!message) {
    return false;
  }
  return RETRYABLE_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}
