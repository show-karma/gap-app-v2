/**
 * Extended tests for utilities/donations/errorMessages.ts
 *
 * Focuses on areas not covered by the existing errorMessages.test.ts:
 * - isRecoverableError
 * - getDetailedErrorInfo
 * - Edge cases in error classification priority
 * - technicalMessage preservation for Error vs non-Error
 */

import {
  DonationErrorCode,
  getDetailedErrorInfo,
  getShortErrorMessage,
  isRecoverableError,
  parseDonationError,
} from "@/utilities/donations/errorMessages";

describe("isRecoverableError", () => {
  const recoverableMessages = [
    { msg: "User rejected transaction", code: DonationErrorCode.USER_REJECTED },
    { msg: "Chain mismatch detected", code: DonationErrorCode.NETWORK_MISMATCH },
    { msg: "Chain sync failed", code: DonationErrorCode.CHAIN_SYNC_ERROR },
    { msg: "Transaction timed out", code: DonationErrorCode.TRANSACTION_TIMEOUT },
    { msg: "Failed to fetch balance", code: DonationErrorCode.BALANCE_FETCH_ERROR },
  ];

  it.each(recoverableMessages)("should return true for $code", ({ msg }) => {
    expect(isRecoverableError(new Error(msg))).toBe(true);
  });

  const nonRecoverableMessages = [
    { msg: "Insufficient funds for gas", code: DonationErrorCode.INSUFFICIENT_GAS },
    { msg: "Insufficient balance", code: DonationErrorCode.INSUFFICIENT_BALANCE },
    { msg: "Execution reverted", code: DonationErrorCode.CONTRACT_ERROR },
    { msg: "Approval failed", code: DonationErrorCode.APPROVAL_ERROR },
    { msg: "Permit signature failed", code: DonationErrorCode.PERMIT_SIGNATURE_ERROR },
    { msg: "Missing payout address", code: DonationErrorCode.PAYOUT_ADDRESS_ERROR },
    { msg: "Random unknown error", code: DonationErrorCode.UNKNOWN_ERROR },
  ];

  it.each(nonRecoverableMessages)("should return false for $code", ({ msg }) => {
    expect(isRecoverableError(new Error(msg))).toBe(false);
  });
});

describe("getDetailedErrorInfo", () => {
  it("should return the same result as parseDonationError", () => {
    const error = new Error("Insufficient funds for gas");
    const detailed = getDetailedErrorInfo(error);
    const parsed = parseDonationError(error);

    expect(detailed).toEqual(parsed);
  });

  it("should include technicalMessage for Error objects in non-user-rejected codes", () => {
    const error = new Error("Insufficient funds for gas fees");
    const info = getDetailedErrorInfo(error);

    expect(info.technicalMessage).toBe(error.message);
  });

  it("should include technicalMessage as String() for non-Error objects in UNKNOWN_ERROR", () => {
    const info = getDetailedErrorInfo(42);
    expect(info.code).toBe(DonationErrorCode.UNKNOWN_ERROR);
    expect(info.technicalMessage).toBe("42");
  });
});

describe("parseDonationError - classification priority", () => {
  it("should classify 'insufficient funds for gas' as INSUFFICIENT_GAS (not INSUFFICIENT_BALANCE)", () => {
    const error = new Error("insufficient funds for gas");
    const parsed = parseDonationError(error);
    expect(parsed.code).toBe(DonationErrorCode.INSUFFICIENT_GAS);
  });

  it("should classify 'wallet client' as CHAIN_SYNC_ERROR (not WALLET_CLIENT_ERROR)", () => {
    const error = new Error("wallet client is not connected");
    const parsed = parseDonationError(error);
    // "wallet client" matches CHAIN_SYNC_ERROR pattern
    expect(parsed.code).toBe(DonationErrorCode.CHAIN_SYNC_ERROR);
  });

  it("should classify a message with both 'permit' and 'approval' as APPROVAL_ERROR (approval checked first)", () => {
    const error = new Error("Token approval for permit failed");
    const parsed = parseDonationError(error);
    expect(parsed.code).toBe(DonationErrorCode.APPROVAL_ERROR);
  });
});

describe("parseDonationError - technicalMessage field", () => {
  it("should NOT set technicalMessage for USER_REJECTED", () => {
    const error = new Error("User rejected request");
    const parsed = parseDonationError(error);
    expect(parsed.technicalMessage).toBeUndefined();
  });

  it("should set technicalMessage for INSUFFICIENT_GAS with Error", () => {
    const error = new Error("insufficient funds for gas");
    const parsed = parseDonationError(error);
    expect(parsed.technicalMessage).toBe(error.message);
  });

  it("should NOT set technicalMessage for INSUFFICIENT_GAS with non-Error", () => {
    // Non-Error string that triggers INSUFFICIENT_GAS
    const parsed = parseDonationError("insufficient funds for gas");
    expect(parsed.technicalMessage).toBeUndefined();
  });

  it("should set technicalMessage as String() for UNKNOWN_ERROR with non-Error", () => {
    const parsed = parseDonationError({ custom: true });
    expect(parsed.code).toBe(DonationErrorCode.UNKNOWN_ERROR);
    expect(parsed.technicalMessage).toBe("[object Object]");
  });
});

describe("getShortErrorMessage - conciseness", () => {
  it("should always return a non-empty string", () => {
    const inputs = [
      new Error("User rejected"),
      new Error("something completely novel"),
      null,
      undefined,
      "",
      0,
    ];

    inputs.forEach((input) => {
      const msg = getShortErrorMessage(input);
      expect(msg.length).toBeGreaterThan(0);
    });
  });
});
