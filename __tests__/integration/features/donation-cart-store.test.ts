/**
 * Integration Tests for Donation Cart Zustand Store
 *
 * Tests the REAL donationCart store from store/donationCart.ts
 * covering all state mutations, derived state, persistence,
 * and edge cases.
 */

import { act, renderHook } from "@testing-library/react";
import { DONATION_CONSTANTS } from "@/constants/donation";
import type { SupportedToken } from "@/constants/supportedTokens";
import { type DonationCartItem, type DonationSession, useDonationCart } from "@/store/donationCart";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createCartItem(overrides?: Partial<DonationCartItem>): DonationCartItem {
  return {
    uid: `project-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test Project",
    slug: "test-project",
    imageURL: "https://example.com/image.png",
    ...overrides,
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

describe("Donation Cart Store", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { result } = renderHook(() => useDonationCart());
    act(() => {
      result.current.clear();
      result.current.clearLastCompletedSession();
    });
  });

  // -----------------------------------------------------------------------
  // Adding items
  // -----------------------------------------------------------------------

  describe("add()", () => {
    it("adds a single item to an empty cart", () => {
      const { result } = renderHook(() => useDonationCart());
      const item = createCartItem({ uid: "proj-1", title: "Alpha" });

      act(() => {
        const added = result.current.add(item);
        expect(added).toBe(true);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toEqual(item);
    });

    it("adds multiple distinct items", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        result.current.add(createCartItem({ uid: "proj-1" }));
        result.current.add(createCartItem({ uid: "proj-2" }));
        result.current.add(createCartItem({ uid: "proj-3" }));
      });

      expect(result.current.items).toHaveLength(3);
    });

    it("returns true and does not duplicate when adding an existing item", () => {
      const { result } = renderHook(() => useDonationCart());
      const item = createCartItem({ uid: "proj-dup" });

      act(() => {
        result.current.add(item);
      });

      let secondAdd = false;
      act(() => {
        secondAdd = result.current.add(item);
      });

      expect(secondAdd).toBe(true);
      expect(result.current.items).toHaveLength(1);
    });

    it("returns false when cart is full (MAX_CART_SIZE)", () => {
      const { result } = renderHook(() => useDonationCart());

      // Fill the cart to MAX_CART_SIZE
      act(() => {
        for (let i = 0; i < DONATION_CONSTANTS.MAX_CART_SIZE; i++) {
          result.current.add(createCartItem({ uid: `proj-${i}` }));
        }
      });

      expect(result.current.items).toHaveLength(DONATION_CONSTANTS.MAX_CART_SIZE);

      let addResult = true;
      act(() => {
        addResult = result.current.add(createCartItem({ uid: "overflow" }));
      });

      expect(addResult).toBe(false);
      expect(result.current.items).toHaveLength(DONATION_CONSTANTS.MAX_CART_SIZE);
    });
  });

  // -----------------------------------------------------------------------
  // Removing items
  // -----------------------------------------------------------------------

  describe("remove()", () => {
    it("removes an existing item by uid", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        result.current.add(createCartItem({ uid: "proj-1" }));
        result.current.add(createCartItem({ uid: "proj-2" }));
      });

      act(() => {
        result.current.remove("proj-1");
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].uid).toBe("proj-2");
    });

    it("cleans up amounts and selectedTokens for removed item", () => {
      const { result } = renderHook(() => useDonationCart());
      const token = createToken();

      act(() => {
        result.current.add(createCartItem({ uid: "proj-1" }));
        result.current.setAmount("proj-1", "100");
        result.current.setSelectedToken("proj-1", token);
      });

      expect(result.current.amounts["proj-1"]).toBe("100");
      expect(result.current.selectedTokens["proj-1"]).toEqual(token);

      act(() => {
        result.current.remove("proj-1");
      });

      expect(result.current.amounts["proj-1"]).toBeUndefined();
      expect(result.current.selectedTokens["proj-1"]).toBeUndefined();
    });

    it("is a no-op when removing a non-existent uid", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        result.current.add(createCartItem({ uid: "proj-1" }));
      });

      act(() => {
        result.current.remove("does-not-exist");
      });

      expect(result.current.items).toHaveLength(1);
    });

    it("removes associated payments when item is removed", () => {
      const { result } = renderHook(() => useDonationCart());
      const token = createToken();

      act(() => {
        result.current.add(createCartItem({ uid: "proj-1" }));
        result.current.setAmount("proj-1", "50");
        result.current.setSelectedToken("proj-1", token);
      });

      // updatePayments should have been called automatically
      expect(result.current.payments).toHaveLength(1);

      act(() => {
        result.current.remove("proj-1");
      });

      expect(result.current.payments).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Toggle
  // -----------------------------------------------------------------------

  describe("toggle()", () => {
    it("adds an item that is not in the cart", () => {
      const { result } = renderHook(() => useDonationCart());
      const item = createCartItem({ uid: "proj-toggle" });

      let toggleResult = false;
      act(() => {
        toggleResult = result.current.toggle(item);
      });

      expect(toggleResult).toBe(true);
      expect(result.current.items).toHaveLength(1);
    });

    it("removes an item that is already in the cart", () => {
      const { result } = renderHook(() => useDonationCart());
      const item = createCartItem({ uid: "proj-toggle" });

      act(() => {
        result.current.add(item);
      });

      let toggleResult = false;
      act(() => {
        toggleResult = result.current.toggle(item);
      });

      expect(toggleResult).toBe(true);
      expect(result.current.items).toHaveLength(0);
    });

    it("returns false when toggling add on a full cart", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        for (let i = 0; i < DONATION_CONSTANTS.MAX_CART_SIZE; i++) {
          result.current.add(createCartItem({ uid: `proj-${i}` }));
        }
      });

      let toggleResult = true;
      act(() => {
        toggleResult = result.current.toggle(createCartItem({ uid: "overflow" }));
      });

      expect(toggleResult).toBe(false);
      expect(result.current.items).toHaveLength(DONATION_CONSTANTS.MAX_CART_SIZE);
    });
  });

  // -----------------------------------------------------------------------
  // Amount management
  // -----------------------------------------------------------------------

  describe("setAmount()", () => {
    it("sets amount for a project", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        result.current.add(createCartItem({ uid: "proj-1" }));
        result.current.setAmount("proj-1", "250.50");
      });

      expect(result.current.amounts["proj-1"]).toBe("250.50");
    });

    it("overwrites a previously set amount", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        result.current.add(createCartItem({ uid: "proj-1" }));
        result.current.setAmount("proj-1", "100");
      });

      act(() => {
        result.current.setAmount("proj-1", "200");
      });

      expect(result.current.amounts["proj-1"]).toBe("200");
    });

    it("auto-updates payments when amount changes", () => {
      const { result } = renderHook(() => useDonationCart());
      const token = createToken({ chainId: 10 });

      act(() => {
        result.current.add(createCartItem({ uid: "proj-1" }));
        result.current.setSelectedToken("proj-1", token);
        result.current.setAmount("proj-1", "100");
      });

      expect(result.current.payments).toHaveLength(1);
      expect(result.current.payments[0].amount).toBe("100");

      act(() => {
        result.current.setAmount("proj-1", "200");
      });

      expect(result.current.payments[0].amount).toBe("200");
    });
  });

  // -----------------------------------------------------------------------
  // Token selection
  // -----------------------------------------------------------------------

  describe("setSelectedToken()", () => {
    it("sets the selected token for a project", () => {
      const { result } = renderHook(() => useDonationCart());
      const token = createToken({ symbol: "USDT" });

      act(() => {
        result.current.add(createCartItem({ uid: "proj-1" }));
        result.current.setSelectedToken("proj-1", token);
      });

      expect(result.current.selectedTokens["proj-1"]).toEqual(token);
    });

    it("auto-updates payments when token changes", () => {
      const { result } = renderHook(() => useDonationCart());
      const usdc = createToken({ symbol: "USDC", chainId: 10 });
      const usdt = createToken({ symbol: "USDT", chainId: 10 });

      act(() => {
        result.current.add(createCartItem({ uid: "proj-1" }));
        result.current.setAmount("proj-1", "50");
        result.current.setSelectedToken("proj-1", usdc);
      });

      expect(result.current.payments[0].token.symbol).toBe("USDC");

      act(() => {
        result.current.setSelectedToken("proj-1", usdt);
      });

      expect(result.current.payments[0].token.symbol).toBe("USDT");
    });
  });

  // -----------------------------------------------------------------------
  // Payments sync
  // -----------------------------------------------------------------------

  describe("updatePayments()", () => {
    it("only creates payments for items with both amount and token set", () => {
      const { result } = renderHook(() => useDonationCart());
      const token = createToken();

      act(() => {
        result.current.add(createCartItem({ uid: "proj-1" }));
        result.current.add(createCartItem({ uid: "proj-2" }));
        // proj-1 has amount + token
        result.current.setAmount("proj-1", "100");
        result.current.setSelectedToken("proj-1", token);
        // proj-2 has only amount, no token
        result.current.setAmount("proj-2", "50");
      });

      expect(result.current.payments).toHaveLength(1);
      expect(result.current.payments[0].projectId).toBe("proj-1");
    });

    it("excludes payments with zero or negative amounts", () => {
      const { result } = renderHook(() => useDonationCart());
      const token = createToken();

      act(() => {
        result.current.add(createCartItem({ uid: "proj-zero" }));
        result.current.setSelectedToken("proj-zero", token);
        result.current.setAmount("proj-zero", "0");
      });

      expect(result.current.payments).toHaveLength(0);
    });

    it("sets chainId from the selected token", () => {
      const { result } = renderHook(() => useDonationCart());
      const token = createToken({ chainId: 42161 });

      act(() => {
        result.current.add(createCartItem({ uid: "proj-1" }));
        result.current.setSelectedToken("proj-1", token);
        result.current.setAmount("proj-1", "10");
      });

      expect(result.current.payments[0].chainId).toBe(42161);
    });
  });

  // -----------------------------------------------------------------------
  // getPaymentForProject
  // -----------------------------------------------------------------------

  describe("getPaymentForProject()", () => {
    it("returns the payment for a specific project", () => {
      const { result } = renderHook(() => useDonationCart());
      const token = createToken();

      act(() => {
        result.current.add(createCartItem({ uid: "proj-1" }));
        result.current.setAmount("proj-1", "75");
        result.current.setSelectedToken("proj-1", token);
      });

      const payment = result.current.getPaymentForProject("proj-1");
      expect(payment).toBeDefined();
      expect(payment?.amount).toBe("75");
    });

    it("returns undefined for a project not in payments", () => {
      const { result } = renderHook(() => useDonationCart());
      expect(result.current.getPaymentForProject("unknown")).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Cart status helpers
  // -----------------------------------------------------------------------

  describe("isCartFull() / isCartWarning() / getCartSize()", () => {
    it("reports correct size", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        result.current.add(createCartItem({ uid: "a" }));
        result.current.add(createCartItem({ uid: "b" }));
      });

      expect(result.current.getCartSize()).toBe(2);
    });

    it("returns false for isCartFull when below max", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        result.current.add(createCartItem({ uid: "a" }));
      });

      expect(result.current.isCartFull()).toBe(false);
    });

    it("returns true for isCartFull when at max", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        for (let i = 0; i < DONATION_CONSTANTS.MAX_CART_SIZE; i++) {
          result.current.add(createCartItem({ uid: `p-${i}` }));
        }
      });

      expect(result.current.isCartFull()).toBe(true);
    });

    it("returns true for isCartWarning when at warning threshold", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        for (let i = 0; i < DONATION_CONSTANTS.CART_SIZE_WARNING_THRESHOLD; i++) {
          result.current.add(createCartItem({ uid: `p-${i}` }));
        }
      });

      expect(result.current.isCartWarning()).toBe(true);
    });

    it("returns false for isCartWarning when below threshold", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        result.current.add(createCartItem({ uid: "only-one" }));
      });

      expect(result.current.isCartWarning()).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Clear
  // -----------------------------------------------------------------------

  describe("clear()", () => {
    it("removes all items, amounts, tokens, and payments", () => {
      const { result } = renderHook(() => useDonationCart());
      const token = createToken();

      act(() => {
        result.current.add(createCartItem({ uid: "proj-1" }));
        result.current.setAmount("proj-1", "100");
        result.current.setSelectedToken("proj-1", token);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.payments).toHaveLength(1);

      act(() => {
        result.current.clear();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.amounts).toEqual({});
      expect(result.current.selectedTokens).toEqual({});
      expect(result.current.payments).toHaveLength(0);
    });

    it("does not clear lastCompletedSession", () => {
      const { result } = renderHook(() => useDonationCart());
      const session: DonationSession = {
        id: "session-1",
        timestamp: Date.now(),
        donations: [],
        totalProjects: 1,
      };

      act(() => {
        result.current.setLastCompletedSession(session);
        result.current.clear();
      });

      expect(result.current.lastCompletedSession).toEqual(session);
    });
  });

  // -----------------------------------------------------------------------
  // Completed session tracking
  // -----------------------------------------------------------------------

  describe("lastCompletedSession", () => {
    it("sets and retrieves a completed session", () => {
      const { result } = renderHook(() => useDonationCart());
      const session: DonationSession = {
        id: "session-42",
        timestamp: 1700000000000,
        donations: [],
        totalProjects: 3,
      };

      act(() => {
        result.current.setLastCompletedSession(session);
      });

      expect(result.current.lastCompletedSession).toEqual(session);
    });

    it("clears the completed session", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        result.current.setLastCompletedSession({
          id: "s-1",
          timestamp: Date.now(),
          donations: [],
          totalProjects: 1,
        });
      });

      act(() => {
        result.current.clearLastCompletedSession();
      });

      expect(result.current.lastCompletedSession).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Persistence (Zustand persist middleware)
  // -----------------------------------------------------------------------

  describe("localStorage persistence", () => {
    it("uses 'donation-cart-storage' as the storage key", () => {
      const { result } = renderHook(() => useDonationCart());

      act(() => {
        result.current.add(createCartItem({ uid: "persist-test" }));
      });

      // Zustand persist writes to localStorage with this key
      const stored = window.localStorage.getItem("donation-cart-storage");
      expect(stored).not.toBeNull();
    });

    it("preserves items across hook re-mounts (Zustand singleton)", () => {
      const hook1 = renderHook(() => useDonationCart());

      act(() => {
        hook1.result.current.add(createCartItem({ uid: "survive" }));
      });

      hook1.unmount();

      const hook2 = renderHook(() => useDonationCart());

      // Zustand stores are singletons -- state survives unmount
      expect(hook2.result.current.items).toHaveLength(1);
      expect(hook2.result.current.items[0].uid).toBe("survive");
    });
  });
});
