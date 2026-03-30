/**
 * Tests for utilities/donations/donationExecution.ts
 *
 * Tests the pure and async utility functions:
 * - validatePayoutAddresses
 * - getTargetChainId
 * - ensureCorrectNetwork
 * - waitForWalletSync
 * - createCompletedDonations
 */

import { NETWORK_CONSTANTS } from "@/constants/donation";
import type { SupportedToken } from "@/constants/supportedTokens";
import {
  createCompletedDonations,
  type DonationPayment,
  ensureCorrectNetwork,
  getTargetChainId,
  validatePayoutAddresses,
  waitForWalletSync,
} from "@/utilities/donations/donationExecution";

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createToken(overrides: Partial<SupportedToken> = {}): SupportedToken {
  return {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    chainId: 10,
    chainName: "Optimism",
    isNative: false,
    ...overrides,
  };
}

function createPayment(overrides: Partial<DonationPayment> = {}): DonationPayment {
  return {
    projectId: "proj-1",
    amount: "10",
    token: createToken(),
    chainId: 10,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("utilities/donations/donationExecution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // validatePayoutAddresses
  // =========================================================================

  describe("validatePayoutAddresses", () => {
    it("should return valid when all payments have payout addresses", () => {
      const payments = [createPayment({ projectId: "p1" }), createPayment({ projectId: "p2" })];
      const addresses = { p1: "0xabc", p2: "0xdef" };

      const result = validatePayoutAddresses(payments, addresses);
      expect(result.valid).toBe(true);
      expect(result.missingAddresses).toHaveLength(0);
    });

    it("should return invalid with missing addresses listed", () => {
      const payments = [createPayment({ projectId: "p1" }), createPayment({ projectId: "p2" })];
      const addresses = { p1: "0xabc" }; // p2 is missing

      const result = validatePayoutAddresses(payments, addresses);
      expect(result.valid).toBe(false);
      expect(result.missingAddresses).toHaveLength(1);
      expect(result.missingAddresses[0].projectId).toBe("p2");
    });

    it("should return valid for empty payments", () => {
      const result = validatePayoutAddresses([], {});
      expect(result.valid).toBe(true);
    });
  });

  // =========================================================================
  // getTargetChainId
  // =========================================================================

  describe("getTargetChainId", () => {
    it("should return the first payment's chainId", () => {
      const payments = [createPayment({ chainId: 10 }), createPayment({ chainId: 8453 })];
      expect(getTargetChainId(payments)).toBe(10);
    });

    it("should return null for empty payments", () => {
      expect(getTargetChainId([])).toBeNull();
    });

    it("should skip payments with falsy chainId", () => {
      const payments = [createPayment({ chainId: 0 }), createPayment({ chainId: 10 })];
      expect(getTargetChainId(payments)).toBe(10);
    });
  });

  // =========================================================================
  // ensureCorrectNetwork
  // =========================================================================

  describe("ensureCorrectNetwork", () => {
    it("should return current chainId if already on target", async () => {
      const switchFn = vi.fn();
      const result = await ensureCorrectNetwork(10, 10, switchFn);
      expect(result).toBe(10);
      expect(switchFn).not.toHaveBeenCalled();
    });

    it("should switch and return target chainId when on different chain", async () => {
      const switchFn = vi.fn().mockResolvedValue(undefined);
      const result = await ensureCorrectNetwork(1, 10, switchFn);
      expect(result).toBe(10);
      expect(switchFn).toHaveBeenCalledWith(10);
    });

    it("should return null when targetChainId is null", async () => {
      const switchFn = vi.fn();
      const result = await ensureCorrectNetwork(10, null, switchFn);
      expect(result).toBeNull();
    });

    it("should return null when switch fails", async () => {
      const switchFn = vi.fn().mockRejectedValue(new Error("switch failed"));
      const result = await ensureCorrectNetwork(1, 10, switchFn);
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // waitForWalletSync
  // =========================================================================

  describe("waitForWalletSync", () => {
    it("should return activeChainId if payment chain matches", async () => {
      const payment = createPayment({ chainId: 10 });
      const result = await waitForWalletSync(payment, 10, vi.fn(), vi.fn());
      expect(result).toBe(10);
    });

    it("should return activeChainId if payment has no chainId", async () => {
      const payment = createPayment({ chainId: 0 });
      const result = await waitForWalletSync(payment, 10, vi.fn(), vi.fn());
      expect(result).toBe(10);
    });

    it("should switch network and wait for sync", async () => {
      const payment = createPayment({ chainId: 8453 });
      const switchFn = vi.fn().mockResolvedValue(undefined);
      const getFreshClient = vi.fn().mockResolvedValue({
        chain: { id: 8453 },
      });

      const result = await waitForWalletSync(payment, 10, switchFn, getFreshClient);
      expect(result).toBe(8453);
      expect(switchFn).toHaveBeenCalledWith(8453);
    });

    it("should throw after max sync attempts", async () => {
      const payment = createPayment({ chainId: 8453 });
      const switchFn = vi.fn().mockResolvedValue(undefined);
      // Always return wrong chain - use immediate resolution to avoid real timers
      const getFreshClient = vi.fn().mockResolvedValue({
        chain: { id: 10 },
      });

      // Use real timers but the delay is 1s * 10 attempts = 10s
      // Instead, mock setTimeout to resolve immediately
      const originalSetTimeout = globalThis.setTimeout;
      vi.stubGlobal("setTimeout", (fn: () => void) => originalSetTimeout(fn, 0));

      try {
        await expect(waitForWalletSync(payment, 10, switchFn, getFreshClient)).rejects.toThrow(
          "Failed to switch to required network"
        );

        expect(getFreshClient).toHaveBeenCalledTimes(NETWORK_CONSTANTS.WALLET_SYNC_MAX_ATTEMPTS);
      } finally {
        vi.stubGlobal("setTimeout", originalSetTimeout);
      }
    });

    it("should throw when network switch itself fails", async () => {
      const payment = createPayment({ chainId: 8453 });
      const switchFn = vi.fn().mockRejectedValue(new Error("switch rejected"));
      const getFreshClient = vi.fn();

      await expect(waitForWalletSync(payment, 10, switchFn, getFreshClient)).rejects.toThrow(
        "Failed to switch to required network"
      );
    });
  });

  // =========================================================================
  // createCompletedDonations
  // =========================================================================

  describe("createCompletedDonations", () => {
    it("should map results to completed donation records", () => {
      const results = [{ projectId: "p1", status: "success", hash: "0xabc" }];
      const payments = [createPayment({ projectId: "p1" })];
      const cartItems = [{ uid: "p1", title: "Project One", slug: "p1-slug", imageURL: "img.png" }];

      const completed = createCompletedDonations(results, payments, cartItems);

      expect(completed).toHaveLength(1);
      expect(completed[0]).toMatchObject({
        projectId: "p1",
        projectTitle: "Project One",
        projectSlug: "p1-slug",
        transactionHash: "0xabc",
        status: "success",
      });
      expect(completed[0].timestamp).toBeGreaterThan(0);
    });

    it("should set empty hash for failed results", () => {
      const results = [{ projectId: "p1", status: "failed", hash: "0xabc" }];
      const payments = [createPayment({ projectId: "p1" })];
      const cartItems = [{ uid: "p1", title: "P1" }];

      const completed = createCompletedDonations(results, payments, cartItems);
      expect(completed[0].transactionHash).toBe("");
      expect(completed[0].status).toBe("failed");
    });

    it("should filter out results with no matching payment", () => {
      const results = [{ projectId: "unknown-project", status: "success", hash: "0xdef" }];
      const payments = [createPayment({ projectId: "p1" })];
      const cartItems: any[] = [];

      const completed = createCompletedDonations(results, payments, cartItems);
      expect(completed).toHaveLength(0);
    });

    it("should use projectId as fallback title when cart item not found", () => {
      const results = [{ projectId: "p1", status: "success", hash: "0xabc" }];
      const payments = [createPayment({ projectId: "p1" })];
      const cartItems: any[] = []; // No matching cart item

      const completed = createCompletedDonations(results, payments, cartItems);
      expect(completed[0].projectTitle).toBe("p1");
    });

    it("should handle empty results array", () => {
      expect(createCompletedDonations([], [], [])).toEqual([]);
    });
  });
});
