/**
 * E2E Tests: Cross-Chain Donation Flow
 *
 * Tests cart data management for multi-chain scenarios.
 * Verifies localStorage state management for donations across chains.
 */

import { EXAMPLE } from "../../support/e2e";
import {
  setupDonationIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("E2E: Cross-Chain Donation Flow", () => {
  const COMMUNITY = EXAMPLE.COMMUNITY;

  beforeEach(() => {
    setupDonationIntercepts();
    cy.clearDonationCart();
    cy.visit("/");
    waitForPageLoad();
  });

  describe("1. Multi-Chain Cart Data", () => {
    it("should store items with chain information", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "project-optimism",
                title: "Optimism Project",
                slug: "optimism-project",
                chainId: 10,
              },
              {
                uid: "project-arbitrum",
                title: "Arbitrum Project",
                slug: "arbitrum-project",
                chainId: 42161,
              },
            ],
            amounts: {},
            selectedTokens: {},
            payments: [],
          },
          version: 0,
        };
        win.localStorage.setItem(
          "donation-cart-storage",
          JSON.stringify(cartData)
        );
      });

      // Verify chain data is stored
      cy.window().then((win) => {
        const stored = win.localStorage.getItem("donation-cart-storage");
        expect(stored).to.not.be.null;

        const parsed = JSON.parse(stored as string);
        expect(parsed.state.items).to.have.length(2);
        expect(parsed.state.items[0].chainId).to.eq(10);
        expect(parsed.state.items[1].chainId).to.eq(42161);
      });
    });

    it("should preserve chain information after page reload", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "persist-chain-test",
                title: "Persist Chain Test",
                slug: "persist-chain-test",
                chainId: 10,
              },
            ],
            amounts: { "persist-chain-test": "10" },
            selectedTokens: { "persist-chain-test": "USDC" },
            payments: [],
          },
          version: 0,
        };
        win.localStorage.setItem(
          "donation-cart-storage",
          JSON.stringify(cartData)
        );
      });

      // Reload page
      cy.reload();
      waitForPageLoad();

      // Verify data persists
      cy.window().then((win) => {
        const stored = win.localStorage.getItem("donation-cart-storage");
        expect(stored).to.not.be.null;

        const parsed = JSON.parse(stored as string);
        expect(parsed.state.items[0].chainId).to.eq(10);
        expect(parsed.state.amounts["persist-chain-test"]).to.eq("10");
      });
    });
  });

  describe("2. Cart Operations", () => {
    it("should add items to cart via localStorage", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              { uid: "item-1", title: "Item 1", slug: "item-1" },
            ],
            amounts: {},
            selectedTokens: {},
            payments: [],
          },
          version: 0,
        };
        win.localStorage.setItem(
          "donation-cart-storage",
          JSON.stringify(cartData)
        );

        // Add second item
        const stored = win.localStorage.getItem("donation-cart-storage");
        const current = JSON.parse(stored as string);
        current.state.items.push({ uid: "item-2", title: "Item 2", slug: "item-2" });
        win.localStorage.setItem(
          "donation-cart-storage",
          JSON.stringify(current)
        );
      });

      // Verify both items exist
      cy.window().then((win) => {
        const stored = win.localStorage.getItem("donation-cart-storage");
        const parsed = JSON.parse(stored as string);
        expect(parsed.state.items).to.have.length(2);
      });
    });

    it("should remove items from cart", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              { uid: "remove-1", title: "Remove 1", slug: "remove-1" },
              { uid: "remove-2", title: "Remove 2", slug: "remove-2" },
            ],
            amounts: {},
            selectedTokens: {},
            payments: [],
          },
          version: 0,
        };
        win.localStorage.setItem(
          "donation-cart-storage",
          JSON.stringify(cartData)
        );

        // Remove first item
        const stored = win.localStorage.getItem("donation-cart-storage");
        const current = JSON.parse(stored as string);
        current.state.items = current.state.items.filter(
          (item: { uid: string }) => item.uid !== "remove-1"
        );
        win.localStorage.setItem(
          "donation-cart-storage",
          JSON.stringify(current)
        );
      });

      // Verify item was removed
      cy.window().then((win) => {
        const stored = win.localStorage.getItem("donation-cart-storage");
        const parsed = JSON.parse(stored as string);
        expect(parsed.state.items).to.have.length(1);
        expect(parsed.state.items[0].uid).to.eq("remove-2");
      });
    });
  });

  describe("3. Community Page Access", () => {
    it("should navigate to community page", () => {
      cy.visitCommunity(COMMUNITY);

      cy.url().should("include", `/${COMMUNITY}`);
      cy.get("body").should("be.visible");
    });
  });
});
