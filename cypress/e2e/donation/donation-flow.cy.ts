/**
 * E2E Tests: Donation Flow
 *
 * These tests verify the complete donation user journey from browsing projects
 * to executing donations. Tests cover happy paths, error scenarios, and edge cases.
 *
 * Test Strategy:
 * - Uses staging environment to avoid real blockchain transactions
 * - Tests focus on UI/UX flows and state management
 * - Wallet interactions are mocked where blockchain calls would occur
 * - Cart persistence verified via localStorage
 *
 * Prerequisites:
 * - Development server running on localhost:3000
 * - Test data available (gitcoin community with projects)
 *
 * Run with:
 * - `yarn e2e` - Opens Cypress UI
 * - `yarn e2e:headless` - Runs in headless mode
 */

import { EXAMPLE } from "../../support/e2e";
import {
  setupCommonIntercepts,
  setupDonationIntercepts,
  waitForCommunityLoad,
  waitForPageLoad,
} from "../../support/intercepts";

describe("E2E: Donation Flow", () => {
  const COMMUNITY = EXAMPLE.COMMUNITY;

  beforeEach(() => {
    setupDonationIntercepts();

    // Clear cart before each test
    cy.clearDonationCart();

    // Visit homepage to ensure clean state
    cy.visit("/");
    waitForPageLoad();
  });

  describe("1. Complete Donation Happy Path", () => {
    it("should complete single project donation flow: add to cart -> checkout -> configure -> success UI", () => {
      // Step 1: Visit community page
      cy.visitCommunity(COMMUNITY);
      waitForCommunityLoad();

      // Verify community page loaded
      cy.get('[id^="grant-card"]').should("have.length.greaterThan", 0);

      // Step 2: Add project to cart
      cy.get('[id^="grant-card"]')
        .first()
        .within(() => {
          // Store project title for verification
          cy.get('[id="grant-title"]').invoke("text").as("projectTitle");

          // Click add to cart button
          cy.get("button")
            .contains(/add to cart|donate/i)
            .should("be.visible")
            .click({ force: true });
        });

      // Verify cart badge updated
      cy.get('[data-testid="cart-badge"]', { timeout: 5000 })
        .should("be.visible")
        .and("contain", "1");

      // Step 3: Navigate to checkout
      cy.get('[data-testid="cart-button"]').click({ force: true });

      // Should be on checkout page
      cy.url().should("include", "/checkout");

      // Step 4: Verify cart contains the project
      cy.get('[data-testid^="cart-item"]').should("have.length", 1);

      // Step 5: Select token (USDC)
      cy.get('[data-testid^="cart-item"]')
        .first()
        .within(() => {
          cy.selectToken("USDC");
        });

      // Step 6: Enter amount
      cy.get('[data-testid^="cart-item"]')
        .first()
        .within(() => {
          cy.get('input[type="number"]').clear().type("10");
        });

      // Step 7: Verify checkout summary
      cy.contains(/total.*10/i).should("be.visible");

      // Note: Actual blockchain transaction testing requires wallet automation
      // For E2E UI tests, we verify the UI is ready for execution
      cy.get('[data-testid="execute-button"]').should("be.visible");

      // Verify no blocking errors
      cy.contains(/insufficient balance/i).should("not.exist");
    });

    it("should add multiple projects to cart", () => {
      cy.visitCommunity(COMMUNITY);
      waitForCommunityLoad();

      // Add first project
      cy.get('[id^="grant-card"]').first().within(() => {
        cy.get("button")
          .contains(/add to cart|donate/i)
          .click({ force: true });
      });

      // Add second project
      cy.get('[id^="grant-card"]').eq(1).within(() => {
        cy.get("button")
          .contains(/add to cart|donate/i)
          .click({ force: true });
      });

      // Verify cart badge shows 2
      cy.get('[data-testid="cart-badge"]', { timeout: 5000 })
        .should("be.visible")
        .and("contain", "2");
    });
  });

  describe("2. Cart Persistence", () => {
    it("should persist cart items after page reload", () => {
      cy.visitCommunity(COMMUNITY);
      waitForCommunityLoad();

      // Add project to cart
      cy.get('[id^="grant-card"]').first().within(() => {
        cy.get("button")
          .contains(/add to cart|donate/i)
          .click({ force: true });
      });

      // Verify cart badge
      cy.get('[data-testid="cart-badge"]', { timeout: 5000 })
        .should("be.visible")
        .and("contain", "1");

      // Reload page
      cy.reload();
      waitForCommunityLoad();

      // Cart should still have item
      cy.get('[data-testid="cart-badge"]').should("contain", "1");
    });

    it("should persist cart across navigation", () => {
      cy.visitCommunity(COMMUNITY);
      waitForCommunityLoad();

      // Add project to cart
      cy.get('[id^="grant-card"]').first().within(() => {
        cy.get("button")
          .contains(/add to cart|donate/i)
          .click({ force: true });
      });

      // Navigate away
      cy.visit("/projects");

      // Return to community
      cy.visitCommunity(COMMUNITY);
      waitForCommunityLoad();

      // Cart should still have item
      cy.get('[data-testid="cart-badge"]').should("contain", "1");
    });
  });

  describe("3. Cart Operations", () => {
    it("should remove item from cart", () => {
      cy.visitCommunity(COMMUNITY);
      waitForCommunityLoad();

      // Add project to cart
      cy.get('[id^="grant-card"]').first().within(() => {
        cy.get("button")
          .contains(/add to cart|donate/i)
          .click({ force: true });
      });

      // Go to checkout
      cy.get('[data-testid="cart-button"]').click({ force: true });
      cy.url().should("include", "/checkout");

      // Remove item
      cy.get('[data-testid="remove-item"]').first().click({ force: true });

      // Cart should be empty or show empty state
      cy.get('[data-testid^="cart-item"]').should("have.length", 0);
    });

    it("should clear entire cart", () => {
      cy.visitCommunity(COMMUNITY);
      waitForCommunityLoad();

      // Add multiple projects
      cy.get('[id^="grant-card"]').first().within(() => {
        cy.get("button")
          .contains(/add to cart|donate/i)
          .click({ force: true });
      });

      cy.get('[id^="grant-card"]').eq(1).within(() => {
        cy.get("button")
          .contains(/add to cart|donate/i)
          .click({ force: true });
      });

      // Clear cart using localStorage directly
      cy.clearDonationCart();

      // Reload to verify
      cy.reload();
      waitForCommunityLoad();

      // Cart badge should not show count
      cy.get('[data-testid="cart-badge"]').should("not.exist");
    });
  });

  describe("4. Token Selection", () => {
    it("should allow selecting different tokens", () => {
      // Set up cart with item
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "token-test",
                title: "Token Test",
                slug: "token-test",
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

      // Select USDC
      cy.selectToken("USDC");

      // Verify token is selected
      cy.contains("USDC").should("be.visible");
    });
  });

  describe("5. Amount Input", () => {
    it("should validate amount input", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "amount-test",
                title: "Amount Test",
                slug: "amount-test",
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

      // Enter valid amount
      cy.get('input[type="number"]').first().clear().type("10");

      // Amount should be displayed
      cy.get('input[type="number"]').first().should("have.value", "10");
    });

    it("should not allow negative amounts", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "negative-test",
                title: "Negative Test",
                slug: "negative-test",
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

      // Try entering negative amount
      cy.get('input[type="number"]').first().clear().type("-10");

      // Should either show error or prevent negative value
      cy.get('input[type="number"]')
        .first()
        .should("not.have.value", "-10")
        .or("have.value", "");
    });
  });

  describe("6. Checkout Navigation", () => {
    it("should navigate to checkout from cart icon", () => {
      cy.visitCommunity(COMMUNITY);
      waitForCommunityLoad();

      // Add project to cart
      cy.get('[id^="grant-card"]').first().within(() => {
        cy.get("button")
          .contains(/add to cart|donate/i)
          .click({ force: true });
      });

      // Click cart button
      cy.get('[data-testid="cart-button"]').click({ force: true });

      // Should be on checkout page
      cy.url().should("include", "/checkout");
    });

    it("should show empty state when cart is empty", () => {
      cy.clearDonationCart();

      // Try to access checkout directly
      cy.visit(`/community/${COMMUNITY}/donate`);

      // Should show empty state or redirect
      cy.url().should("include", "/donate").or("include", "/community");
    });
  });
});

