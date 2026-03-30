import { act } from "@testing-library/react";
import { DONATION_CONSTANTS } from "@/constants/donation";
import type { SupportedToken } from "@/constants/supportedTokens";
import { type DonationCartItem, type DonationSession, useDonationCart } from "@/store/donationCart";

// Helper to create a cart item
function makeItem(n: number): DonationCartItem {
  return {
    uid: `project-${n}`,
    title: `Project ${n}`,
    slug: `project-${n}`,
    imageURL: `https://example.com/project-${n}.png`,
  };
}

// Helper to create a supported token
function makeToken(overrides?: Partial<SupportedToken>): SupportedToken {
  return {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    chainId: 1,
    chainName: "Ethereum",
    isNative: false,
    ...overrides,
  };
}

describe("useDonationCart store", () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    act(() => {
      useDonationCart.getState().clear();
      useDonationCart.getState().clearLastCompletedSession();
    });
  });

  describe("initial state", () => {
    it("starts with empty items array", () => {
      const state = useDonationCart.getState();
      expect(state.items).toEqual([]);
    });

    it("starts with empty amounts record", () => {
      expect(useDonationCart.getState().amounts).toEqual({});
    });

    it("starts with empty selectedTokens record", () => {
      expect(useDonationCart.getState().selectedTokens).toEqual({});
    });

    it("starts with empty payments array", () => {
      expect(useDonationCart.getState().payments).toEqual([]);
    });

    it("starts with null lastCompletedSession", () => {
      expect(useDonationCart.getState().lastCompletedSession).toBeNull();
    });

    it("reports cart is not full on empty cart", () => {
      expect(useDonationCart.getState().isCartFull()).toBe(false);
    });

    it("reports cart is not warning on empty cart", () => {
      expect(useDonationCart.getState().isCartWarning()).toBe(false);
    });

    it("reports cart size as 0", () => {
      expect(useDonationCart.getState().getCartSize()).toBe(0);
    });
  });

  describe("add", () => {
    it("adds an item and returns true", () => {
      const item = makeItem(1);
      const result = useDonationCart.getState().add(item);
      expect(result).toBe(true);
      expect(useDonationCart.getState().items).toHaveLength(1);
      expect(useDonationCart.getState().items[0]).toEqual(item);
    });

    it("returns true (no-op) when adding a duplicate item", () => {
      const item = makeItem(1);
      useDonationCart.getState().add(item);
      const result = useDonationCart.getState().add(item);
      expect(result).toBe(true);
      expect(useDonationCart.getState().items).toHaveLength(1);
    });

    it("returns false when cart is at maximum capacity", () => {
      // Fill the cart to max
      for (let i = 0; i < DONATION_CONSTANTS.MAX_CART_SIZE; i++) {
        useDonationCart.getState().add(makeItem(i));
      }
      expect(useDonationCart.getState().getCartSize()).toBe(DONATION_CONSTANTS.MAX_CART_SIZE);

      const result = useDonationCart.getState().add(makeItem(999));
      expect(result).toBe(false);
      expect(useDonationCart.getState().getCartSize()).toBe(DONATION_CONSTANTS.MAX_CART_SIZE);
    });
  });

  describe("remove", () => {
    it("removes an item by uid", () => {
      const item1 = makeItem(1);
      const item2 = makeItem(2);
      useDonationCart.getState().add(item1);
      useDonationCart.getState().add(item2);

      useDonationCart.getState().remove(item1.uid);

      expect(useDonationCart.getState().items).toHaveLength(1);
      expect(useDonationCart.getState().items[0].uid).toBe(item2.uid);
    });

    it("cleans up amounts and selectedTokens for removed item", () => {
      const item = makeItem(1);
      const token = makeToken();
      useDonationCart.getState().add(item);
      useDonationCart.getState().setAmount(item.uid, "100");
      useDonationCart.getState().setSelectedToken(item.uid, token);

      useDonationCart.getState().remove(item.uid);

      expect(useDonationCart.getState().amounts[item.uid]).toBeUndefined();
      expect(useDonationCart.getState().selectedTokens[item.uid]).toBeUndefined();
    });

    it("cleans up payments for removed item", () => {
      const item = makeItem(1);
      const token = makeToken();
      useDonationCart.getState().add(item);
      useDonationCart.getState().setAmount(item.uid, "50");
      useDonationCart.getState().setSelectedToken(item.uid, token);

      expect(useDonationCart.getState().payments).toHaveLength(1);

      useDonationCart.getState().remove(item.uid);
      expect(useDonationCart.getState().payments).toHaveLength(0);
    });

    it("does nothing when removing non-existent uid", () => {
      const item = makeItem(1);
      useDonationCart.getState().add(item);
      useDonationCart.getState().remove("non-existent");
      expect(useDonationCart.getState().items).toHaveLength(1);
    });
  });

  describe("toggle", () => {
    it("adds item if not in cart and returns true", () => {
      const item = makeItem(1);
      const result = useDonationCart.getState().toggle(item);
      expect(result).toBe(true);
      expect(useDonationCart.getState().items).toHaveLength(1);
    });

    it("removes item if already in cart and returns true", () => {
      const item = makeItem(1);
      useDonationCart.getState().add(item);
      const result = useDonationCart.getState().toggle(item);
      expect(result).toBe(true);
      expect(useDonationCart.getState().items).toHaveLength(0);
    });

    it("returns false when toggling on and cart is full", () => {
      for (let i = 0; i < DONATION_CONSTANTS.MAX_CART_SIZE; i++) {
        useDonationCart.getState().add(makeItem(i));
      }
      const result = useDonationCart.getState().toggle(makeItem(999));
      expect(result).toBe(false);
    });
  });

  describe("clear", () => {
    it("resets items, amounts, selectedTokens, and payments", () => {
      const item = makeItem(1);
      const token = makeToken();
      useDonationCart.getState().add(item);
      useDonationCart.getState().setAmount(item.uid, "100");
      useDonationCart.getState().setSelectedToken(item.uid, token);

      useDonationCart.getState().clear();

      const state = useDonationCart.getState();
      expect(state.items).toEqual([]);
      expect(state.amounts).toEqual({});
      expect(state.selectedTokens).toEqual({});
      expect(state.payments).toEqual([]);
    });

    it("does not clear lastCompletedSession", () => {
      const session: DonationSession = {
        id: "session-1",
        timestamp: Date.now(),
        donations: [],
        totalProjects: 0,
      };
      useDonationCart.getState().setLastCompletedSession(session);
      useDonationCart.getState().clear();
      expect(useDonationCart.getState().lastCompletedSession).toEqual(session);
    });
  });

  describe("setAmount and payment sync", () => {
    it("stores the amount for a given uid", () => {
      const item = makeItem(1);
      useDonationCart.getState().add(item);
      useDonationCart.getState().setAmount(item.uid, "42.5");
      expect(useDonationCart.getState().amounts[item.uid]).toBe("42.5");
    });

    it("auto-syncs payments when amount and token are both set", () => {
      const item = makeItem(1);
      const token = makeToken({ chainId: 10 });
      useDonationCart.getState().add(item);
      useDonationCart.getState().setSelectedToken(item.uid, token);
      useDonationCart.getState().setAmount(item.uid, "25");

      const payments = useDonationCart.getState().payments;
      expect(payments).toHaveLength(1);
      expect(payments[0]).toEqual({
        projectId: item.uid,
        amount: "25",
        token,
        chainId: 10,
      });
    });

    it("does not create a payment when amount is 0", () => {
      const item = makeItem(1);
      const token = makeToken();
      useDonationCart.getState().add(item);
      useDonationCart.getState().setSelectedToken(item.uid, token);
      useDonationCart.getState().setAmount(item.uid, "0");

      expect(useDonationCart.getState().payments).toHaveLength(0);
    });

    it("does not create a payment without a selected token", () => {
      const item = makeItem(1);
      useDonationCart.getState().add(item);
      useDonationCart.getState().setAmount(item.uid, "100");
      expect(useDonationCart.getState().payments).toHaveLength(0);
    });
  });

  describe("setSelectedToken", () => {
    it("stores the token for a given project", () => {
      const token = makeToken({ symbol: "DAI" });
      useDonationCart.getState().setSelectedToken("proj-1", token);
      expect(useDonationCart.getState().selectedTokens["proj-1"]).toEqual(token);
    });
  });

  describe("getPaymentForProject", () => {
    it("returns undefined when no payment exists", () => {
      expect(useDonationCart.getState().getPaymentForProject("proj-1")).toBeUndefined();
    });

    it("returns the payment for a specific project", () => {
      const item = makeItem(1);
      const token = makeToken();
      useDonationCart.getState().add(item);
      useDonationCart.getState().setSelectedToken(item.uid, token);
      useDonationCart.getState().setAmount(item.uid, "10");

      const payment = useDonationCart.getState().getPaymentForProject(item.uid);
      expect(payment).toBeDefined();
      expect(payment?.projectId).toBe(item.uid);
      expect(payment?.amount).toBe("10");
    });
  });

  describe("isCartFull and isCartWarning", () => {
    it("returns true for isCartWarning at threshold", () => {
      for (let i = 0; i < DONATION_CONSTANTS.CART_SIZE_WARNING_THRESHOLD; i++) {
        useDonationCart.getState().add(makeItem(i));
      }
      expect(useDonationCart.getState().isCartWarning()).toBe(true);
    });

    it("returns false for isCartWarning below threshold", () => {
      for (let i = 0; i < DONATION_CONSTANTS.CART_SIZE_WARNING_THRESHOLD - 1; i++) {
        useDonationCart.getState().add(makeItem(i));
      }
      expect(useDonationCart.getState().isCartWarning()).toBe(false);
    });
  });

  describe("session tracking", () => {
    it("stores and clears last completed session", () => {
      const session: DonationSession = {
        id: "session-1",
        timestamp: Date.now(),
        donations: [
          {
            projectId: "proj-1",
            projectTitle: "Project 1",
            amount: "100",
            token: makeToken(),
            chainId: 1,
            transactionHash: "0xabc",
            timestamp: Date.now(),
            status: "success",
          },
        ],
        totalProjects: 1,
      };

      useDonationCart.getState().setLastCompletedSession(session);
      expect(useDonationCart.getState().lastCompletedSession).toEqual(session);

      useDonationCart.getState().clearLastCompletedSession();
      expect(useDonationCart.getState().lastCompletedSession).toBeNull();
    });
  });

  describe("concurrent operations", () => {
    it("handles rapid add/remove sequences correctly", () => {
      const items = Array.from({ length: 10 }, (_, i) => makeItem(i));

      // Rapidly add all
      items.forEach((item) => useDonationCart.getState().add(item));
      expect(useDonationCart.getState().getCartSize()).toBe(10);

      // Remove odd-indexed items
      items
        .filter((_, i) => i % 2 === 1)
        .forEach((item) => useDonationCart.getState().remove(item.uid));
      expect(useDonationCart.getState().getCartSize()).toBe(5);

      // Remaining items should be even-indexed
      const remaining = useDonationCart.getState().items;
      remaining.forEach((item) => {
        const idx = Number(item.uid.replace("project-", ""));
        expect(idx % 2).toBe(0);
      });
    });

    it("handles multiple token/amount updates for different projects", () => {
      const items = Array.from({ length: 3 }, (_, i) => makeItem(i));
      const tokens = [
        makeToken({ symbol: "USDC", chainId: 1 }),
        makeToken({ symbol: "DAI", chainId: 10 }),
        makeToken({ symbol: "USDT", chainId: 42161 }),
      ];

      items.forEach((item, i) => {
        useDonationCart.getState().add(item);
        useDonationCart.getState().setSelectedToken(item.uid, tokens[i]);
        useDonationCart.getState().setAmount(item.uid, String((i + 1) * 100));
      });

      const payments = useDonationCart.getState().payments;
      expect(payments).toHaveLength(3);
      expect(payments[0].amount).toBe("100");
      expect(payments[1].amount).toBe("200");
      expect(payments[2].amount).toBe("300");
    });
  });
});
