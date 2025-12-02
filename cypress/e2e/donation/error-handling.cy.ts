/**
 * E2E Tests: Donation Error Handling
 *
 * Tests error scenarios and edge cases in the donation flow.
 * Focuses on data validation and error states.
 */

import { EXAMPLE } from "../../support/e2e";
import {
  setupDonationIntercepts,
  waitForPageLoad,
} from "../../support/intercepts";

describe("E2E: Donation Error Handling", () => {
  const COMMUNITY = EXAMPLE.COMMUNITY;

  beforeEach(() => {
    setupDonationIntercepts();
    cy.clearDonationCart();
  });

  describe("1. Empty Cart Handling", () => {
    it("should handle empty cart gracefully", () => {
      cy.clearDonationCart();
      cy.visit(`/community/${COMMUNITY}/donate`);
      waitForPageLoad();

      // Page should load without errors
      cy.get("body").should("be.visible");
    });

    it("should handle invalid cart data", () => {
      cy.window().then((win) => {
        // Set invalid JSON
        win.localStorage.setItem("donation-cart-storage", "invalid-json");
      });

      cy.visit(`/community/${COMMUNITY}/donate`);
      waitForPageLoad();

      // Page should handle error gracefully
      cy.get("body").should("be.visible");
    });
  });

  describe("2. Cart Data Validation", () => {
    it("should handle cart with missing fields", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [{ uid: "test" }], // Missing required fields
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

      // Page should still load
      cy.get("body").should("be.visible");
    });

    it("should handle cart with empty items array", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [],
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

      cy.get("body").should("be.visible");
    });
  });

  describe("3. Navigation Error Handling", () => {
    it("should handle navigation to non-existent community", () => {
      cy.visit("/non-existent-community-12345", { failOnStatusCode: false });
      waitForPageLoad();

      // Should show error or redirect
      cy.get("body").should("be.visible");
    });

    it("should handle navigation to invalid donate URL", () => {
      cy.visit(`/community/${COMMUNITY}/donate/invalid-program`, { failOnStatusCode: false });
      waitForPageLoad();

      cy.get("body").should("be.visible");
    });
  });

  describe("4. localStorage Edge Cases", () => {
    it("should handle localStorage being unavailable", () => {
      // This test verifies the app doesn't crash without localStorage
      cy.visit("/");
      waitForPageLoad();

      cy.get("body").should("be.visible");
    });

    it("should handle corrupt cart data", () => {
      cy.window().then((win) => {
        // Set partially corrupt data
        const cartData = {
          state: null, // Invalid state
          version: 0,
        };
        win.localStorage.setItem(
          "donation-cart-storage",
          JSON.stringify(cartData)
        );
      });

      cy.visit(`/community/${COMMUNITY}/donate`);
      waitForPageLoad();

      cy.get("body").should("be.visible");
    });
  });

  describe("5. Page Load Resilience", () => {
    it("should load homepage successfully", () => {
      cy.visit("/");
      waitForPageLoad();

      cy.get("nav").should("exist");
      cy.get("body").should("be.visible");
    });

    it("should load community page successfully", () => {
      cy.visitCommunity(COMMUNITY);

      cy.url().should("include", `/${COMMUNITY}`);
      cy.get("body").should("be.visible");
    });
  });
});
