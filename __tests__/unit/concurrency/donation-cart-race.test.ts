/**
 * Donation cart Zustand store — concurrent mutation safety tests.
 *
 * Imports the REAL useDonationCart store and verifies that rapid,
 * interleaved mutations (add/remove/toggle/setAmount/clear) do not
 * corrupt state or produce inconsistencies.
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DONATION_CONSTANTS } from "@/constants/donation";
import type { SupportedToken } from "@/constants/supportedTokens";
import { type DonationCartItem, useDonationCart } from "@/store/donationCart";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createItem(uid: string): DonationCartItem {
  return {
    uid,
    title: `Project ${uid}`,
    slug: `project-${uid}`,
    imageURL: `https://example.com/${uid}.png`,
  };
}

function createToken(overrides?: Partial<SupportedToken>): SupportedToken {
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Donation Cart — concurrent mutation safety", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useDonationCart());
    act(() => {
      result.current.clear();
      result.current.clearLastCompletedSession();
    });
  });

  // -------------------------------------------------------------------------
  // Rapid add/remove cycles
  // -------------------------------------------------------------------------

  it("should not corrupt state after 100 rapid add/remove cycles on the same item", () => {
    const { result } = renderHook(() => useDonationCart());
    const item = createItem("rapid-1");

    act(() => {
      for (let i = 0; i < 100; i++) {
        result.current.add(item);
        result.current.remove(item.uid);
      }
    });

    // After equal add/remove pairs, item should not be in the cart
    expect(result.current.items).toHaveLength(0);
    expect(result.current.amounts[item.uid]).toBeUndefined();
    expect(result.current.selectedTokens[item.uid]).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Concurrent setAmount for different items
  // -------------------------------------------------------------------------

  it("should handle concurrent setAmount calls for different items without interference", () => {
    const { result } = renderHook(() => useDonationCart());
    const items = Array.from({ length: 10 }, (_, i) => createItem(`amt-${i}`));

    act(() => {
      for (const item of items) {
        result.current.add(item);
      }
    });

    // Set amounts for all 10 items in a single act
    act(() => {
      for (let i = 0; i < items.length; i++) {
        result.current.setAmount(items[i].uid, `${(i + 1) * 10}`);
      }
    });

    // Verify each item has its correct amount
    for (let i = 0; i < items.length; i++) {
      expect(result.current.amounts[items[i].uid]).toBe(`${(i + 1) * 10}`);
    }
    expect(result.current.items).toHaveLength(10);
  });

  // -------------------------------------------------------------------------
  // Rapid toggle on same item converges correctly
  // -------------------------------------------------------------------------

  it("should converge to correct state after odd number of rapid toggles (item present)", () => {
    const { result } = renderHook(() => useDonationCart());
    const item = createItem("toggle-odd");

    act(() => {
      // 51 toggles on empty cart: add, remove, add, ... ends with add
      for (let i = 0; i < 51; i++) {
        result.current.toggle(item);
      }
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].uid).toBe("toggle-odd");
  });

  it("should converge to correct state after even number of rapid toggles (item absent)", () => {
    const { result } = renderHook(() => useDonationCart());
    const item = createItem("toggle-even");

    act(() => {
      // 50 toggles on empty cart: add, remove, add, ... ends with remove
      for (let i = 0; i < 50; i++) {
        result.current.toggle(item);
      }
    });

    expect(result.current.items).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // clear() during add() race
  // -------------------------------------------------------------------------

  it("should end in a cleared state when clear() is called after adds", () => {
    const { result } = renderHook(() => useDonationCart());

    act(() => {
      for (let i = 0; i < 20; i++) {
        result.current.add(createItem(`pre-clear-${i}`));
      }
      // Clear wipes everything
      result.current.clear();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.amounts).toEqual({});
    expect(result.current.selectedTokens).toEqual({});
    expect(result.current.payments).toHaveLength(0);
  });

  it("should retain items added after clear() in a single act block", () => {
    const { result } = renderHook(() => useDonationCart());
    const postClear = createItem("post-clear");

    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.add(createItem(`before-${i}`));
      }
      result.current.clear();
      // Add one item after clear
      result.current.add(postClear);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].uid).toBe("post-clear");
  });

  // -------------------------------------------------------------------------
  // updatePayments() while items being removed
  // -------------------------------------------------------------------------

  it("should produce consistent payments after interleaved setAmount/remove/updatePayments", () => {
    const { result } = renderHook(() => useDonationCart());
    const token = createToken();
    const items = Array.from({ length: 5 }, (_, i) => createItem(`pay-${i}`));

    act(() => {
      for (const item of items) {
        result.current.add(item);
        result.current.setSelectedToken(item.uid, token);
        result.current.setAmount(item.uid, "100");
      }
    });

    expect(result.current.payments).toHaveLength(5);

    // Remove items 0, 2, 4 and update payments in rapid succession
    act(() => {
      result.current.remove("pay-0");
      result.current.remove("pay-2");
      result.current.remove("pay-4");
      result.current.updatePayments();
    });

    // Only pay-1 and pay-3 should remain
    expect(result.current.items).toHaveLength(2);
    expect(result.current.payments).toHaveLength(2);
    expect(result.current.payments.map((p) => p.projectId).sort()).toEqual(["pay-1", "pay-3"]);
  });

  // -------------------------------------------------------------------------
  // State consistency: items count === amounts keys that match items
  // -------------------------------------------------------------------------

  it("should maintain items/amounts/payments consistency after mixed operations", () => {
    const { result } = renderHook(() => useDonationCart());
    const token = createToken();

    act(() => {
      // Add 10 items
      for (let i = 0; i < 10; i++) {
        result.current.add(createItem(`mix-${i}`));
      }
      // Set amounts for all
      for (let i = 0; i < 10; i++) {
        result.current.setAmount(`mix-${i}`, `${i + 1}`);
        result.current.setSelectedToken(`mix-${i}`, token);
      }
      // Remove odd-indexed items
      for (let i = 1; i < 10; i += 2) {
        result.current.remove(`mix-${i}`);
      }
    });

    const itemUids = new Set(result.current.items.map((i) => i.uid));

    // Every remaining item should have no orphaned amounts
    for (const uid of Object.keys(result.current.amounts)) {
      expect(itemUids.has(uid)).toBe(true);
    }

    // Payments should only reference remaining items
    for (const payment of result.current.payments) {
      expect(itemUids.has(payment.projectId)).toBe(true);
    }

    expect(result.current.items).toHaveLength(5);
    expect(result.current.payments).toHaveLength(5);
  });

  // -------------------------------------------------------------------------
  // Rapid setAmount overwrites converge to last value
  // -------------------------------------------------------------------------

  it("should converge to the last setAmount value after 100 rapid updates", () => {
    const { result } = renderHook(() => useDonationCart());
    const item = createItem("rapid-amt");

    act(() => {
      result.current.add(item);
    });

    act(() => {
      for (let i = 0; i < 100; i++) {
        result.current.setAmount(item.uid, `${i}`);
      }
    });

    expect(result.current.amounts[item.uid]).toBe("99");
  });

  // -------------------------------------------------------------------------
  // Cart full boundary under rapid adds
  // -------------------------------------------------------------------------

  it("should respect MAX_CART_SIZE even under rapid add attempts", () => {
    const { result } = renderHook(() => useDonationCart());
    const totalAttempts = DONATION_CONSTANTS.MAX_CART_SIZE + 20;

    act(() => {
      for (let i = 0; i < totalAttempts; i++) {
        result.current.add(createItem(`full-${i}`));
      }
    });

    expect(result.current.items).toHaveLength(DONATION_CONSTANTS.MAX_CART_SIZE);
    expect(result.current.isCartFull()).toBe(true);
  });
});
