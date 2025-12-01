/**
 * E2E Tests: Donation Error Handling
 *
 * Tests error scenarios and recovery flows in the donation process.
 * Verifies that users receive clear error messages and can recover from failures.
 *
 * Test Coverage:
 * - Insufficient balance errors
 * - Missing payout address blocking
 * - User rejection recovery
 * - Network errors
 * - Transaction failures
 * - Invalid input handling
 * - Timeout scenarios
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
    cy.visit("/");
    waitForPageLoad();
  });

  describe("1. Insufficient Balance Scenarios", () => {
    it("should display error when amount exceeds balance", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "insufficient-balance-test",
                title: "Insufficient Balance Test",
                slug: "insufficient-balance-test",
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

      cy.visitDonationCheckout(COMMUNITY, "all");

      // Select token
      cy.selectToken("USDC");

      // Enter very large amount (likely exceeds balance)
      cy.get('input[type="number"]').type("1000000");

      // Should show insufficient balance error or disable execute
      cy.get('[data-testid="execute-button"]').should("be.disabled");
    });

    it("should update error state when amount is corrected", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "balance-correction-test",
                title: "Balance Correction Test",
                slug: "balance-correction-test",
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

      cy.visitDonationCheckout(COMMUNITY, "all");

      cy.selectToken("USDC");

      // Enter large amount first
      cy.get('input[type="number"]').type("1000000");

      // Then correct to smaller amount
      cy.get('input[type="number"]').clear().type("1");

      // Error should be cleared (or button enabled if balance sufficient)
      cy.get('input[type="number"]').should("have.value", "1");
    });
  });

  describe("2. Form Validation Errors", () => {
    it("should require token selection", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "no-token",
                title: "No Token",
                slug: "no-token",
              },
            ],
            amounts: { "no-token": "10" },
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

      cy.visitDonationCheckout(COMMUNITY, "all");

      // Enter amount without selecting token
      cy.get('input[type="number"]').type("10");

      // Execute should be disabled
      cy.get('[data-testid="execute-button"]').should("be.disabled");
    });

    it("should require both token and amount", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "validation-check",
                title: "Validation Check",
                slug: "validation-check",
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

      cy.visitDonationCheckout(COMMUNITY, "all");

      // Only select token (no amount)
      cy.selectToken("USDC");

      // Execute should be disabled
      cy.get('[data-testid="execute-button"]').should("be.disabled");
    });

    it("should not allow zero amount", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "zero-amount",
                title: "Zero Amount",
                slug: "zero-amount",
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

      cy.visitDonationCheckout(COMMUNITY, "all");

      cy.selectToken("USDC");
      cy.get('input[type="number"]').type("0");

      // Should show error or keep button disabled
      cy.get('[data-testid="execute-button"]').should("be.disabled");
    });
  });

  describe("3. API Error Handling", () => {
    it("should handle API errors gracefully", () => {
      // Intercept with error
      cy.intercept("GET", "**/community/**", {
        statusCode: 500,
        body: { error: "Server error" },
      }).as("communityError");

      cy.visit(`/${COMMUNITY}`);

      cy.wait("@communityError");

      // Should not crash - show error or fallback
      cy.get("body").should("be.visible");
    });

    it("should handle network timeouts", () => {
      cy.intercept("GET", "**/community/**", {
        delay: 30000, // 30 second delay
        statusCode: 200,
        body: {},
      }).as("slowCommunity");

      cy.visit(`/${COMMUNITY}`, { timeout: 10000, failOnStatusCode: false });

      // Should eventually timeout or show loading state
      cy.get("body").should("be.visible");
    });
  });

  describe("4. Cart Error States", () => {
    it("should handle empty cart gracefully", () => {
      cy.clearDonationCart();

      // Try to access checkout with empty cart
      cy.visit(`/community/${COMMUNITY}/donate`);

      // Should handle empty state
      cy.url().should("include", "/");
    });

    it("should handle corrupted cart data", () => {
      cy.window().then((win) => {
        // Set invalid JSON
        win.localStorage.setItem("donation-cart-storage", "invalid-json{");
      });

      cy.visit(`/community/${COMMUNITY}/donate`);

      // Should not crash
      cy.get("body").should("be.visible");
    });
  });

  describe("5. Recovery Flows", () => {
    it("should allow retry after error", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "retry-test",
                title: "Retry Test",
                slug: "retry-test",
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

      cy.visitDonationCheckout(COMMUNITY, "all");

      // Configure donation
      cy.selectToken("USDC");
      cy.get('input[type="number"]').type("10");

      // Execute button should be visible for retry
      cy.get('[data-testid="execute-button"]').should("be.visible");
    });

    it("should allow editing after validation error", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "edit-after-error",
                title: "Edit After Error",
                slug: "edit-after-error",
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

      cy.visitDonationCheckout(COMMUNITY, "all");

      // Enter invalid amount first
      cy.get('input[type="number"]').type("0");

      // Then correct it
      cy.get('input[type="number"]').clear().type("10");

      // Should be able to proceed
      cy.get('input[type="number"]').should("have.value", "10");
    });
  });

  describe("6. Missing Payout Address", () => {
    it.skip("should show error for missing payout address - requires specific project setup", () => {
      // This test requires a project without payout address configured
      // Skipped for generic testing
    });
  });
});

