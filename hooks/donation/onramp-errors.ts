export enum OnrampErrorCode {
  SESSION_CREATION_FAILED = "SESSION_CREATION_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  INVALID_AMOUNT = "INVALID_AMOUNT",
  UNSUPPORTED_CHAIN = "UNSUPPORTED_CHAIN",
  MISSING_PAYOUT_ADDRESS = "MISSING_PAYOUT_ADDRESS",
  INVALID_URL = "INVALID_URL",
}

export class OnrampError extends Error {
  constructor(
    public readonly code: OnrampErrorCode,
    message: string,
    public readonly userMessage: string
  ) {
    super(message);
    this.name = "OnrampError";
  }

  static sessionCreationFailed(details?: string): OnrampError {
    return new OnrampError(
      OnrampErrorCode.SESSION_CREATION_FAILED,
      `Session creation failed: ${details || "Unknown error"}`,
      "Unable to start payment. Please try again."
    );
  }

  static unsupportedChain(chainId: number): OnrampError {
    return new OnrampError(
      OnrampErrorCode.UNSUPPORTED_CHAIN,
      `Chain ${chainId} not supported for onramp`,
      "Card payments are not available for this network."
    );
  }

  static invalidAmount(reason: string): OnrampError {
    return new OnrampError(OnrampErrorCode.INVALID_AMOUNT, `Invalid amount: ${reason}`, reason);
  }

  static missingPayoutAddress(): OnrampError {
    return new OnrampError(
      OnrampErrorCode.MISSING_PAYOUT_ADDRESS,
      "Payout address is required",
      "Project payout address is not configured."
    );
  }

  static invalidUrl(): OnrampError {
    return new OnrampError(
      OnrampErrorCode.INVALID_URL,
      "Invalid onramp URL generated",
      "Unable to redirect to payment provider."
    );
  }
}
