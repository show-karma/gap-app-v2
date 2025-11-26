/**
 * Error message utility for donation feature
 * Maps Web3 errors to user-friendly, actionable messages
 */

export enum DonationErrorCode {
  USER_REJECTED = "USER_REJECTED",
  INSUFFICIENT_GAS = "INSUFFICIENT_GAS",
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  NETWORK_MISMATCH = "NETWORK_MISMATCH",
  CONTRACT_ERROR = "CONTRACT_ERROR",
  BALANCE_FETCH_ERROR = "BALANCE_FETCH_ERROR",
  PAYOUT_ADDRESS_ERROR = "PAYOUT_ADDRESS_ERROR",
  APPROVAL_ERROR = "APPROVAL_ERROR",
  PERMIT_SIGNATURE_ERROR = "PERMIT_SIGNATURE_ERROR",
  CHAIN_SYNC_ERROR = "CHAIN_SYNC_ERROR",
  WALLET_CLIENT_ERROR = "WALLET_CLIENT_ERROR",
  TRANSACTION_TIMEOUT = "TRANSACTION_TIMEOUT",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface ParsedError {
  code: DonationErrorCode;
  message: string;
  technicalMessage?: string;
  actionableSteps: string[];
}

/**
 * Parse a Web3 error and return user-friendly information
 */
export function parseDonationError(error: unknown): ParsedError {
  const errorMessage =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // User rejected transaction
  if (
    errorMessage.includes("user rejected") ||
    errorMessage.includes("user denied") ||
    errorMessage.includes("user cancelled") ||
    errorMessage.includes("rejected by user")
  ) {
    return {
      code: DonationErrorCode.USER_REJECTED,
      message: "Transaction cancelled by user",
      actionableSteps: [
        "Approve the transaction in your wallet to proceed",
        "If you want to cancel, you can close this page",
      ],
    };
  }

  // Insufficient gas
  if (
    errorMessage.includes("insufficient funds for gas") ||
    errorMessage.includes("insufficient funds for intrinsic transaction cost") ||
    errorMessage.includes("out of gas")
  ) {
    return {
      code: DonationErrorCode.INSUFFICIENT_GAS,
      message: "Insufficient gas to complete transaction",
      technicalMessage: error instanceof Error ? error.message : undefined,
      actionableSteps: [
        "Add more ETH to your wallet to cover gas fees",
        "Try again when gas prices are lower",
        "Consider using a different network with lower fees",
      ],
    };
  }

  // Insufficient balance
  if (
    errorMessage.includes("insufficient balance") ||
    errorMessage.includes("insufficient funds") ||
    errorMessage.includes("exceeds balance")
  ) {
    return {
      code: DonationErrorCode.INSUFFICIENT_BALANCE,
      message: "Insufficient token balance",
      technicalMessage: error instanceof Error ? error.message : undefined,
      actionableSteps: [
        "Check your wallet balance",
        "Reduce the donation amount",
        "Add more tokens to your wallet",
      ],
    };
  }

  // Network mismatch
  if (
    errorMessage.includes("chain mismatch") ||
    errorMessage.includes("wrong network") ||
    errorMessage.includes("switch network") ||
    errorMessage.includes("network switch")
  ) {
    return {
      code: DonationErrorCode.NETWORK_MISMATCH,
      message: "Network mismatch detected",
      technicalMessage: error instanceof Error ? error.message : undefined,
      actionableSteps: [
        "Switch to the required network in your wallet",
        "Confirm the network switch when prompted",
        "Try the transaction again after switching",
      ],
    };
  }

  // Contract errors (reverts)
  if (
    errorMessage.includes("execution reverted") ||
    errorMessage.includes("transaction reverted") ||
    errorMessage.includes("contract error")
  ) {
    // Try to extract revert reason
    const revertReasonMatch = errorMessage.match(/reason: (.+?)(?:\n|$)/);
    const revertReason = revertReasonMatch ? revertReasonMatch[1] : undefined;

    return {
      code: DonationErrorCode.CONTRACT_ERROR,
      message: revertReason ? `Contract error: ${revertReason}` : "Contract execution failed",
      technicalMessage: error instanceof Error ? error.message : undefined,
      actionableSteps: [
        "Check that the contract supports this donation",
        "Verify the recipient address is valid",
        "Contact support if the issue persists",
      ],
    };
  }

  // Approval errors
  if (errorMessage.includes("approval") || errorMessage.includes("allowance")) {
    return {
      code: DonationErrorCode.APPROVAL_ERROR,
      message: "Token approval failed",
      technicalMessage: error instanceof Error ? error.message : undefined,
      actionableSteps: [
        "Try approving the token again",
        "Check your wallet has enough gas for approval",
        "Contact support if approval keeps failing",
      ],
    };
  }

  // Permit signature errors
  if (
    errorMessage.includes("permit") ||
    errorMessage.includes("signature") ||
    errorMessage.includes("sign typed data")
  ) {
    return {
      code: DonationErrorCode.PERMIT_SIGNATURE_ERROR,
      message: "Signature request failed",
      technicalMessage: error instanceof Error ? error.message : undefined,
      actionableSteps: [
        "Sign the message in your wallet to proceed",
        "Ensure you're signing the correct message",
        "Try refreshing the page if signature keeps failing",
      ],
    };
  }

  // Chain sync errors
  if (
    errorMessage.includes("chain sync") ||
    errorMessage.includes("wallet client") ||
    errorMessage.includes("failed to sync")
  ) {
    return {
      code: DonationErrorCode.CHAIN_SYNC_ERROR,
      message: "Wallet connection issue detected",
      technicalMessage: error instanceof Error ? error.message : undefined,
      actionableSteps: [
        "Disconnect and reconnect your wallet",
        "Switch to the required network manually",
        "Refresh the page and try again",
      ],
    };
  }

  // Transaction timeout
  if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
    return {
      code: DonationErrorCode.TRANSACTION_TIMEOUT,
      message: "Transaction timed out",
      technicalMessage: error instanceof Error ? error.message : undefined,
      actionableSteps: [
        "Check the transaction status on block explorer",
        "Try again with higher gas price if transaction didn't go through",
        "Contact support if the issue persists",
      ],
    };
  }

  // Balance fetch errors
  if (errorMessage.includes("balance") && errorMessage.includes("fetch")) {
    return {
      code: DonationErrorCode.BALANCE_FETCH_ERROR,
      message: "Failed to fetch balance",
      technicalMessage: error instanceof Error ? error.message : undefined,
      actionableSteps: [
        "You can still proceed with the donation",
        "Check your wallet directly for balance information",
        "Refresh the page to try fetching balances again",
      ],
    };
  }

  // Payout address errors
  if (errorMessage.includes("payout") || errorMessage.includes("recipient address")) {
    return {
      code: DonationErrorCode.PAYOUT_ADDRESS_ERROR,
      message: "Payout address issue",
      technicalMessage: error instanceof Error ? error.message : undefined,
      actionableSteps: [
        "Contact the project owner to configure their payout address",
        "Try donating to a different project",
        "Contact support if you believe this is an error",
      ],
    };
  }

  // Unknown error - return as much info as possible
  return {
    code: DonationErrorCode.UNKNOWN_ERROR,
    message: "An unexpected error occurred",
    technicalMessage: error instanceof Error ? error.message : String(error),
    actionableSteps: [
      "Try the transaction again",
      "Refresh the page and reconnect your wallet",
      "Contact support with the error details below",
    ],
  };
}

/**
 * Get a short, user-friendly error message
 */
export function getShortErrorMessage(error: unknown): string {
  return parseDonationError(error).message;
}

/**
 * Get the full parsed error with actionable steps
 */
export function getDetailedErrorInfo(error: unknown): ParsedError {
  return parseDonationError(error);
}

/**
 * Check if an error is user-recoverable (can retry)
 */
export function isRecoverableError(error: unknown): boolean {
  const parsed = parseDonationError(error);
  const recoverableCodes = [
    DonationErrorCode.USER_REJECTED,
    DonationErrorCode.NETWORK_MISMATCH,
    DonationErrorCode.CHAIN_SYNC_ERROR,
    DonationErrorCode.WALLET_CLIENT_ERROR,
    DonationErrorCode.BALANCE_FETCH_ERROR,
    DonationErrorCode.TRANSACTION_TIMEOUT,
  ];
  return recoverableCodes.includes(parsed.code);
}
