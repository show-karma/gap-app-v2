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
});
