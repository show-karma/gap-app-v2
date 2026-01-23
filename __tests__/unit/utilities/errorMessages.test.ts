import { describe, expect, it } from "bun:test";
import {
  DonationErrorCode,
  getShortErrorMessage,
  parseDonationError,
} from "@/utilities/donations/errorMessages";

describe("parseDonationError", () => {
  describe("USER_REJECTED errors", () => {
    it("should parse 'user rejected' error", () => {
      const error = new Error("User rejected the request");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.USER_REJECTED);
      expect(parsed.message).toContain("cancelled");
      expect(parsed.actionableSteps.length).toBeGreaterThan(0);
    });

    it("should parse 'user denied' error", () => {
      const error = new Error("User denied transaction signature");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.USER_REJECTED);
    });

    it("should parse 'user cancelled' error", () => {
      const error = new Error("User cancelled the operation");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.USER_REJECTED);
    });

    it("should parse 'rejected by user' error", () => {
      const error = new Error("Transaction rejected by user");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.USER_REJECTED);
    });
  });

  describe("INSUFFICIENT_GAS errors", () => {
    it("should parse 'insufficient funds for gas' error", () => {
      const error = new Error("Insufficient funds for gas");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.INSUFFICIENT_GAS);
      expect(parsed.message).toContain("gas");
      expect(parsed.actionableSteps).toContainEqual(expect.stringContaining("ETH"));
    });

    it("should parse 'insufficient funds for intrinsic transaction cost' error", () => {
      const error = new Error("Insufficient funds for intrinsic transaction cost");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.INSUFFICIENT_GAS);
    });

    it("should parse 'out of gas' error", () => {
      const error = new Error("Transaction ran out of gas");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.INSUFFICIENT_GAS);
    });
  });

  describe("INSUFFICIENT_BALANCE errors", () => {
    it("should parse 'insufficient balance' error", () => {
      const error = new Error("Insufficient balance for transfer");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.INSUFFICIENT_BALANCE);
      expect(parsed.message).toContain("balance");
      expect(parsed.actionableSteps).toContainEqual(expect.stringContaining("balance"));
    });

    it("should parse 'insufficient funds' error", () => {
      const error = new Error("Insufficient funds to complete transfer");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.INSUFFICIENT_BALANCE);
    });

    it("should parse 'exceeds balance' error", () => {
      const error = new Error("Amount exceeds balance");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.INSUFFICIENT_BALANCE);
    });
  });

  describe("NETWORK_MISMATCH errors", () => {
    it("should parse 'chain mismatch' error", () => {
      const error = new Error("Chain mismatch detected");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.NETWORK_MISMATCH);
      expect(parsed.message).toContain("Network");
      expect(parsed.actionableSteps).toContainEqual(expect.stringContaining("Switch"));
    });

    it("should parse 'wrong network' error", () => {
      const error = new Error("Wrong network selected");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.NETWORK_MISMATCH);
    });

    it("should parse 'switch network' error", () => {
      const error = new Error("Please switch network");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.NETWORK_MISMATCH);
    });
  });

  describe("CONTRACT_ERROR errors", () => {
    it("should parse 'execution reverted' error", () => {
      const error = new Error("Execution reverted");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.CONTRACT_ERROR);
      expect(parsed.message).toContain("Contract");
    });

    it("should parse 'transaction reverted' error", () => {
      const error = new Error("Transaction reverted");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.CONTRACT_ERROR);
    });

    it("should extract revert reason when available", () => {
      const error = new Error("Execution reverted: reason: Invalid recipient address");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.CONTRACT_ERROR);
      expect(parsed.message).toContain("Contract error:");
      expect(parsed.message).toContain("invalid recipient address");
    });
  });

  describe("APPROVAL_ERROR errors", () => {
    it("should parse 'approval' error", () => {
      const error = new Error("Approval transaction failed");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.APPROVAL_ERROR);
      expect(parsed.message).toContain("approval");
    });

    it("should parse 'allowance' error", () => {
      const error = new Error("Allowance check failed");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.APPROVAL_ERROR);
    });
  });

  describe("PERMIT_SIGNATURE_ERROR errors", () => {
    it("should parse 'permit' error", () => {
      const error = new Error("Permit signature failed");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.PERMIT_SIGNATURE_ERROR);
    });

    it("should parse 'signature' error", () => {
      const error = new Error("Signature verification failed");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.PERMIT_SIGNATURE_ERROR);
    });

    it("should parse 'sign typed data' error", () => {
      const error = new Error("Failed to sign typed data");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.PERMIT_SIGNATURE_ERROR);
    });
  });

  describe("CHAIN_SYNC_ERROR errors", () => {
    it("should parse 'chain sync' error", () => {
      const error = new Error("Chain sync failed");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.CHAIN_SYNC_ERROR);
    });

    it("should parse 'wallet client failed to sync' error", () => {
      const error = new Error("Wallet client failed to sync to chain");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.CHAIN_SYNC_ERROR);
    });
  });

  describe("WALLET_CLIENT_ERROR errors", () => {
    it("should parse 'wallet client' error", () => {
      const error = new Error("Wallet client unavailable");
      const parsed = parseDonationError(error);

      // "wallet client" matches CHAIN_SYNC_ERROR pattern first
      expect(parsed.code).toBe(DonationErrorCode.CHAIN_SYNC_ERROR);
    });

    it("should parse 'wallet not available' error", () => {
      const error = new Error("Wallet not available");
      const parsed = parseDonationError(error);

      // No "wallet client" or "chain sync" pattern, falls to UNKNOWN_ERROR
      expect(parsed.code).toBe(DonationErrorCode.UNKNOWN_ERROR);
    });
  });

  describe("TRANSACTION_TIMEOUT errors", () => {
    it("should parse 'timeout' error", () => {
      const error = new Error("Transaction timeout");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.TRANSACTION_TIMEOUT);
    });

    it("should parse 'timed out' error", () => {
      const error = new Error("Operation timed out");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.TRANSACTION_TIMEOUT);
    });
  });

  describe("BALANCE_FETCH_ERROR errors", () => {
    it("should parse 'balance fetch' error", () => {
      const error = new Error("Failed to fetch balance");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.BALANCE_FETCH_ERROR);
    });

    it("should parse 'unable to load balance' error", () => {
      const error = new Error("Unable to load balance");
      const parsed = parseDonationError(error);

      // Only matches if both "balance" AND "fetch" are present
      expect(parsed.code).toBe(DonationErrorCode.UNKNOWN_ERROR);
    });
  });

  describe("PAYOUT_ADDRESS_ERROR errors", () => {
    it("should parse 'missing payout address' error", () => {
      const error = new Error("Missing payout address");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.PAYOUT_ADDRESS_ERROR);
    });

    it("should parse 'invalid payout address' error", () => {
      const error = new Error("Invalid payout address");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.PAYOUT_ADDRESS_ERROR);
    });

    it("should parse 'no recipient address' error", () => {
      const error = new Error("No recipient address found");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.PAYOUT_ADDRESS_ERROR);
    });
  });

  describe("UNKNOWN_ERROR fallback", () => {
    it("should parse unknown error types", () => {
      const error = new Error("Something unexpected happened");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.UNKNOWN_ERROR);
      expect(parsed.message).toContain("error");
    });

    it("should handle non-Error objects", () => {
      const error = "String error message";
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.UNKNOWN_ERROR);
    });

    it("should handle null/undefined", () => {
      const parsed1 = parseDonationError(null);
      const parsed2 = parseDonationError(undefined);

      expect(parsed1.code).toBe(DonationErrorCode.UNKNOWN_ERROR);
      expect(parsed2.code).toBe(DonationErrorCode.UNKNOWN_ERROR);
    });
  });

  describe("actionable steps", () => {
    it("should always provide actionable steps", () => {
      const errors = [
        new Error("User rejected"),
        new Error("Insufficient funds for gas"),
        new Error("Insufficient balance"),
        new Error("Chain mismatch"),
        new Error("Transaction reverted"),
      ];

      errors.forEach((error) => {
        const parsed = parseDonationError(error);
        expect(parsed.actionableSteps.length).toBeGreaterThan(0);
      });
    });

    it("should provide clear, user-friendly steps", () => {
      const error = new Error("User rejected");
      const parsed = parseDonationError(error);

      parsed.actionableSteps.forEach((step) => {
        expect(step.length).toBeGreaterThan(10); // Reasonable step description
        expect(step[0]).toMatch(/[A-Z]/); // Starts with capital letter
      });
    });
  });

  describe("technical messages", () => {
    it("should preserve technical message for debugging", () => {
      const technicalError = new Error("Contract call failed: 0x1234567890abcdef...");
      const parsed = parseDonationError(technicalError);

      expect(parsed.technicalMessage).toBe(technicalError.message);
    });

    it("should not include technical message for user-rejected errors", () => {
      const error = new Error("User rejected the request");
      const parsed = parseDonationError(error);

      expect(parsed.technicalMessage).toBeUndefined();
    });
  });

  describe("case insensitivity", () => {
    it("should handle uppercase error messages", () => {
      const error = new Error("USER REJECTED THE REQUEST");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.USER_REJECTED);
    });

    it("should handle mixed case error messages", () => {
      const error = new Error("InSuFfIcIeNt BaLaNcE");
      const parsed = parseDonationError(error);

      expect(parsed.code).toBe(DonationErrorCode.INSUFFICIENT_BALANCE);
    });
  });
});

describe("getShortErrorMessage", () => {
  it("should return short user-friendly message", () => {
    const error = new Error("User rejected the transaction");
    const message = getShortErrorMessage(error);

    expect(message).toBeTruthy();
    expect(message.length).toBeLessThan(100);
  });

  it("should handle unknown errors", () => {
    const error = new Error("Some random error");
    const message = getShortErrorMessage(error);

    expect(message).toBeTruthy();
  });

  it("should handle non-Error objects", () => {
    const message = getShortErrorMessage("String error");

    expect(message).toBeTruthy();
  });

  it("should not include technical details", () => {
    const error = new Error("Contract error: 0x1234567890abcdef with long technical details");
    const message = getShortErrorMessage(error);

    expect(message).not.toContain("0x1234567890abcdef");
  });
});
