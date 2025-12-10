/**
 * Error codes for attestation-related errors.
 */
export type AttestationErrorCode =
  | "USER_REJECTED"
  | "PAYMASTER_ERROR"
  | "WALLET_NOT_DEPLOYED"
  | "NETWORK_ERROR"
  | "TX_NOT_INDEXED"
  | "UNKNOWN_ERROR";

/**
 * Custom error class for attestation-related errors.
 * Provides error codes for programmatic handling.
 */
export class AttestationError extends Error {
  constructor(
    message: string,
    public code: AttestationErrorCode,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "AttestationError";
  }
}

/**
 * Analyzes an error and returns a structured AttestationError.
 * Useful for providing user-friendly error messages and programmatic error handling.
 *
 * @example
 * try {
 *   await community.attest(signer, data);
 * } catch (error) {
 *   const attestError = handleAttestationError(error);
 *   switch (attestError.code) {
 *     case 'USER_REJECTED':
 *       toast.info('Transaction cancelled');
 *       break;
 *     case 'PAYMASTER_ERROR':
 *       toast.error('Gas sponsorship unavailable');
 *       break;
 *     default:
 *       toast.error(attestError.message);
 *   }
 * }
 */
export function handleAttestationError(error: unknown): AttestationError {
  // Handle Error instances
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // User rejected transaction
    if (message.includes("user rejected") || message.includes("user denied")) {
      return new AttestationError(
        "Transaction was cancelled by user",
        "USER_REJECTED",
        error
      );
    }

    // Paymaster/gas sponsorship errors
    if (message.includes("paymaster") || message.includes("sponsor")) {
      return new AttestationError(
        "Gas sponsorship failed. The paymaster may be out of funds or rejecting this transaction.",
        "PAYMASTER_ERROR",
        error
      );
    }

    // Smart wallet not deployed
    if (
      message.includes("smart wallet") ||
      message.includes("account not deployed") ||
      message.includes("aa21") // ERC-4337 error code for account not deployed
    ) {
      return new AttestationError(
        "Smart wallet needs to be deployed. Please try again.",
        "WALLET_NOT_DEPLOYED",
        error
      );
    }

    // RPC/Network errors
    if (
      message.includes("rpc") ||
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("timeout")
    ) {
      return new AttestationError(
        "Network error. Please check your connection and try again.",
        "NETWORK_ERROR",
        error
      );
    }

    // Transaction not found after confirmation
    if (message.includes("not found after confirmation")) {
      return new AttestationError(
        "Transaction submitted but not yet indexed. Please wait and check your attestations.",
        "TX_NOT_INDEXED",
        error
      );
    }
  }

  // Unknown error
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred";

  return new AttestationError(errorMessage, "UNKNOWN_ERROR", error);
}

/**
 * Returns a user-friendly message for an attestation error code.
 */
export function getErrorMessage(code: AttestationErrorCode): string {
  switch (code) {
    case "USER_REJECTED":
      return "Transaction cancelled";
    case "PAYMASTER_ERROR":
      return "Gas sponsorship unavailable. Please try again later.";
    case "WALLET_NOT_DEPLOYED":
      return "Setting up your wallet. Please try again.";
    case "NETWORK_ERROR":
      return "Network error. Please check your connection.";
    case "TX_NOT_INDEXED":
      return "Transaction pending. Please wait a moment.";
    case "UNKNOWN_ERROR":
    default:
      return "An unexpected error occurred. Please try again.";
  }
}
