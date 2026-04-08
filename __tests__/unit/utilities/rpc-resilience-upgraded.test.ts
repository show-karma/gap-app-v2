/**
 * RPC resilience tests with realistic viem error structures.
 *
 * Upgrades existing plain-string error tests to use shapes resembling
 * viem's ContractFunctionRevertedError, UserRejectedRequestError,
 * TimeoutError, etc. Also adds transport-level failure mode tests.
 *
 * These tests document how parseDonationError classifies real-world
 * viem errors, including cases where classification differs from the
 * "ideal" mapping (documented in comments).
 */

import { describe, expect, it } from "vitest";
import {
  DonationErrorCode,
  isRecoverableError,
  parseDonationError,
} from "@/utilities/donations/errorMessages";

// ---------------------------------------------------------------------------
// Realistic viem error factory helpers (matching viem's error structure)
// ---------------------------------------------------------------------------

/** Simulates viem's ContractFunctionRevertedError with "execution reverted" */
function createContractRevertError(reason?: string): Error {
  const msg = reason
    ? `execution reverted\nreason: ${reason}\n\nContract Call:\n  address: 0xToken`
    : "execution reverted: contract call failed\n\nRequest Arguments:\n  from: 0xSender";
  const err = new Error(msg);
  err.name = "ContractFunctionRevertedError";
  return Object.assign(err, {
    data: reason ? { errorName: reason } : undefined,
  });
}

/** Simulates viem's UserRejectedRequestError shape */
function createUserRejectedError(): Error {
  const err = new Error(
    "User rejected the request.\n\nDetails: MetaMask Tx Signature: User denied transaction signature."
  );
  err.name = "UserRejectedRequestError";
  return Object.assign(err, {
    code: 4001,
    shortMessage: "User rejected the request.",
  });
}

/** Simulates viem's TimeoutError shape */
function createTimeoutError(): Error {
  const err = new Error(
    'Request timed out after 30000ms.\n\nURL: https://rpc.ankr.com/optimism\nRequest body: {"method":"eth_sendRawTransaction"}'
  );
  err.name = "TimeoutError";
  return err;
}

/** Simulates HTTP 429 rate limit response */
function createRateLimitError(): Error {
  const err = new Error(
    'HTTP request failed.\n\nStatus: 429\nURL: https://rpc.ankr.com/optimism\nBody: {"error":{"message":"Too Many Requests"}}'
  );
  err.name = "HttpRequestError";
  return Object.assign(err, {
    status: 429,
  });
}

/** Simulates insufficient gas with numeric gas values */
function createInsufficientGasError(required: bigint, available: bigint): Error {
  return new Error(
    `Insufficient funds for gas * price + value. ` +
      `Required ${required.toString()} wei, available ${available.toString()} wei. ` +
      `Insufficient funds for gas`
  );
}

// ---------------------------------------------------------------------------
// Upgraded tests: realistic viem error structures
// ---------------------------------------------------------------------------

describe("RPC resilience — viem error structures", () => {
  describe("ContractFunctionRevertedError", () => {
    it("classifies 'execution reverted' as CONTRACT_ERROR", () => {
      const err = createContractRevertError();
      const parsed = parseDonationError(err);
      expect(parsed.code).toBe(DonationErrorCode.CONTRACT_ERROR);
    });

    it("extracts revert reason from viem error message", () => {
      const err = createContractRevertError("TransferFailed()");
      const parsed = parseDonationError(err);
      expect(parsed.code).toBe(DonationErrorCode.CONTRACT_ERROR);
      // parseDonationError lowercases the error message before regex matching,
      // so the extracted reason is also lowercase
      expect(parsed.message.toLowerCase()).toContain("transferfailed");
    });

    it("provides actionable steps for contract reverts", () => {
      const err = createContractRevertError("TransferFailed()");
      const parsed = parseDonationError(err);
      expect(parsed.actionableSteps.length).toBeGreaterThan(0);
      expect(parsed.actionableSteps).toEqual(
        expect.arrayContaining([expect.stringContaining("contract")])
      );
    });

    it("preserves technical message from viem error", () => {
      const err = createContractRevertError("InvalidRecipient()");
      const parsed = parseDonationError(err);
      expect(parsed.technicalMessage).toContain("execution reverted");
    });
  });

  describe("UserRejectedRequestError", () => {
    it("classifies user rejection with viem error shape", () => {
      const err = createUserRejectedError();
      const parsed = parseDonationError(err);
      expect(parsed.code).toBe(DonationErrorCode.USER_REJECTED);
      expect(parsed.message).toBe("Transaction cancelled by user");
    });

    it("is classified as recoverable", () => {
      const err = createUserRejectedError();
      expect(isRecoverableError(err)).toBe(true);
    });

    it("does not include technical message for user rejections", () => {
      const err = createUserRejectedError();
      const parsed = parseDonationError(err);
      expect(parsed.technicalMessage).toBeUndefined();
    });
  });

  describe("TimeoutError", () => {
    it("classifies 'timed out' from viem error shape", () => {
      const err = createTimeoutError();
      const parsed = parseDonationError(err);
      expect(parsed.code).toBe(DonationErrorCode.TRANSACTION_TIMEOUT);
    });

    it("is classified as recoverable", () => {
      const err = createTimeoutError();
      expect(isRecoverableError(err)).toBe(true);
    });
  });

  describe("InsufficientFundsError", () => {
    it("classifies insufficient gas with numeric gas values", () => {
      const err = createInsufficientGasError(BigInt("21000000000000"), BigInt("5000000000000"));
      const parsed = parseDonationError(err);
      expect(parsed.code).toBe(DonationErrorCode.INSUFFICIENT_GAS);
      expect(parsed.technicalMessage).toContain("21000000000000");
    });
  });
});

// ---------------------------------------------------------------------------
// New transport-level tests
// ---------------------------------------------------------------------------

describe("RPC resilience — transport-level failures", () => {
  it("HTTP 429 rate limiting falls to UNKNOWN_ERROR (not specially handled)", () => {
    // Documents current behavior: 429 rate limiting is not specially classified
    const err = createRateLimitError();
    const parsed = parseDonationError(err);
    expect(parsed.code).toBe(DonationErrorCode.UNKNOWN_ERROR);
    expect(parsed.technicalMessage).toContain("429");
  });

  it("chain mismatch with hex chain IDs is detected as NETWORK_MISMATCH", () => {
    const err = new Error(
      "Chain mismatch: wallet is on chain 0x1 (1) but transaction targets chain 0xa (10)"
    );
    const parsed = parseDonationError(err);
    expect(parsed.code).toBe(DonationErrorCode.NETWORK_MISMATCH);
  });

  it("insufficient gas with numeric gas values is classified correctly", () => {
    const err = createInsufficientGasError(BigInt("500000000000000"), BigInt("100000000000"));
    const parsed = parseDonationError(err);
    expect(parsed.code).toBe(DonationErrorCode.INSUFFICIENT_GAS);
  });

  it("contract custom error decoding (Solidity revert) extracts reason", () => {
    const err = new Error(
      "execution reverted: custom error 0x08c379a0\nreason: ERC20: transfer amount exceeds allowance"
    );
    const parsed = parseDonationError(err);
    expect(parsed.code).toBe(DonationErrorCode.CONTRACT_ERROR);
    // parseDonationError lowercases before matching, but message preserves case via reason regex
    expect(parsed.message.toLowerCase()).toContain("erc20: transfer amount exceeds allowance");
  });

  it("unknown error falls back to UNKNOWN_ERROR with technical details", () => {
    const err = new Error("ECONNREFUSED 127.0.0.1:8545");
    const parsed = parseDonationError(err);
    expect(parsed.code).toBe(DonationErrorCode.UNKNOWN_ERROR);
    expect(parsed.technicalMessage).toContain("ECONNREFUSED");
    expect(parsed.actionableSteps.length).toBeGreaterThan(0);
  });
});
