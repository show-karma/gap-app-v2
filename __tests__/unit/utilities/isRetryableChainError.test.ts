/**
 * @file Unit tests for isRetryableChainError.
 *
 * Guards the mapping that decides whether project create/update shows the
 * actionable "try again in a moment" toast (GAP-FRONTEND-23C) instead of the
 * generic failure message.
 */
import { describe, expect, it } from "vitest";
import { isRetryableChainError } from "@/utilities/isRetryableChainError";

describe("isRetryableChainError", () => {
  describe("retryable failures", () => {
    it.each([
      "Couldn't switch your wallet to the required network (chain 8453); it is still on chain 1. Please try again in a moment.",
      "Failed to obtain signer from embedded wallet: Couldn't switch your wallet to the required network (chain 8453); it is still on chain 1. Please try again in a moment.",
      'could not coalesce error (error={ "message": "HTTP request failed" })',
      "JsonRpcProvider failed to detect network and cannot start up",
      "network changed: 1 => 8453",
    ])("returns true for: %s", (message) => {
      expect(isRetryableChainError(new Error(message))).toBe(true);
    });

    it("matches case-insensitively", () => {
      expect(isRetryableChainError(new Error("STILL ON CHAIN 1"))).toBe(true);
    });

    it("accepts a raw string, not only Error instances", () => {
      expect(isRetryableChainError("please try again in a moment")).toBe(true);
    });
  });

  describe("non-retryable failures", () => {
    it.each([
      "There was an error creating Goldsky project.",
      "Validation failed: title is required",
      "Request failed with status code 500",
    ])("returns false for: %s", (message) => {
      expect(isRetryableChainError(new Error(message))).toBe(false);
    });

    it("returns false for null/undefined/empty", () => {
      expect(isRetryableChainError(null)).toBe(false);
      expect(isRetryableChainError(undefined)).toBe(false);
      expect(isRetryableChainError(new Error(""))).toBe(false);
    });
  });

  // GAP-FRONTEND-23J: duelling wallet extensions recurse into each other until
  // the JS stack blows, and ethers reports that as "could not coalesce error" —
  // a pattern on the retryable list. But the failure is DETERMINISTIC: the user
  // retried by hand 45 seconds later and failed identically in 1.2s. Treating
  // it as retryable makes `attestWithRetry` burn three attempts and shows a
  // "try again in a moment" toast that is advice the user cannot act on.
  describe("wallet-provider conflicts are never retryable", () => {
    it("returns false for a bare stack overflow", () => {
      expect(isRetryableChainError(new RangeError("Maximum call stack size exceeded"))).toBe(false);
    });

    it("returns false even though the ethers wrapper matches 'could not coalesce'", () => {
      const conflict = Object.assign(
        new Error(
          'could not coalesce error (error={ "message": "Unknown connector error" }, payload={ "method": "eth_sendTransaction" })'
        ),
        { code: "UNKNOWN_ERROR", error: new RangeError("Maximum call stack size exceeded") }
      );

      expect(conflict.message).toContain("could not coalesce");
      expect(isRetryableChainError(conflict)).toBe(false);
    });

    it("still treats a genuine wallet timeout in the same wrapper as retryable", () => {
      const timeout = Object.assign(
        new Error('could not coalesce error (error={ "message": "Wallet timeout" })'),
        { code: "UNKNOWN_ERROR", error: { message: "Wallet timeout" } }
      );

      expect(isRetryableChainError(timeout)).toBe(true);
    });
  });
});
