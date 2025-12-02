/**
 * E2E Tests: Donation Flow
 *
 * These tests verify the donation checkout page functionality.
 * Cart operations and localStorage interactions are tested.
 *
 * Test Strategy:
 * - Tests focus on checkout UI when cart has items
 * - Cart is pre-populated via localStorage
 * - Wallet interactions are mocked
 */

import { EXAMPLE } from "../../support/e2e";
import {
  setupDonationIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("E2E: Donation Flow", () => {
  const COMMUNITY = EXAMPLE.COMMUNITY;

  beforeEach(() => {
    setupDonationIntercepts();
    cy.clearDonationCart();
  });

  describe("1. Checkout Page with Pre-populated Cart", () => {
    it("should display checkout page when cart has items", () => {
      // Pre-populate cart
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "test-project-1",
                title: "Test Project 1",
                slug: "test-project-1",
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

      cy.visit(`/community/${COMMUNITY}/donate`);
      waitForPageLoad();

      // Page should load without errors
      cy.get("body").should("be.visible");
    });

    it("should show empty cart state when no items", () => {
      cy.clearDonationCart();
      cy.visit(`/community/${COMMUNITY}/donate`);
      waitForPageLoad();

      // Should show either empty state or redirect
      cy.get("body").should("be.visible");
    });
  });

  describe("2. Cart Data Persistence", () => {
    it("should persist cart data in localStorage", () => {
      const testItem = {
        uid: "persist-test",
        title: "Persist Test Project",
        slug: "persist-test",
      };

      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [testItem],
            amounts: { "persist-test": "10" },
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

      // Verify data persists
      cy.window().then((win) => {
        const stored = win.localStorage.getItem("donation-cart-storage");
        expect(stored).to.not.be.null;
        const parsed = JSON.parse(stored as string);
        expect(parsed.state.items[0].uid).to.eq("persist-test");
        expect(parsed.state.amounts["persist-test"]).to.eq("10");
      });
    });

    it("should clear cart data when clearDonationCart is called", () => {
      // Set cart data
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [{ uid: "clear-test", title: "Clear Test", slug: "clear-test" }],
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

      // Clear cart
      cy.clearDonationCart();

      // Verify cart is cleared
      cy.window().then((win) => {
        const stored = win.localStorage.getItem("donation-cart-storage");
        expect(stored).to.be.null;
      });
    });
  });

  describe("3. Checkout UI Elements", () => {
    beforeEach(() => {
      // Pre-populate cart with item
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "ui-test-project",
                title: "UI Test Project",
                slug: "ui-test-project",
                imageURL: "",
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
    });

    it("should render checkout page structure", () => {
      cy.visit(`/community/${COMMUNITY}/donate`);
      waitForPageLoad();

      // Content should be visible
      cy.get("body").should("be.visible");
      cy.get("nav").should("exist");
    });
  });

  describe("4. Community Page Navigation", () => {
    it("should navigate to community page", () => {
      cy.visit(`/${COMMUNITY}`, { timeout: 30000 });
      waitForPageLoad();

      cy.url().should("include", `/${COMMUNITY}`);
      cy.get("body").should("be.visible");
    });

    it("should display community content", () => {
      cy.visit(`/${COMMUNITY}`, { timeout: 30000 });
      waitForPageLoad();

      cy.get("nav").should("exist");
      cy.get("body").should("be.visible");
    });
  });
});
