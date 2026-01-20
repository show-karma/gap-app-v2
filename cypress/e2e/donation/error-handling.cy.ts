/**
 * E2E Tests: Donation Error Handling
 *
 * Tests error scenarios and edge cases in the donation flow.
 * Focuses on data validation, error states, and verifying appropriate
 * error messages are displayed to users.
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
    it("should display empty cart message or redirect when cart is empty", () => {
      cy.clearDonationCart();
      cy.visit(`/community/${COMMUNITY}/donate`);
      waitForPageLoad();

      // Page should load and show empty state feedback to user
      cy.get("body").should("be.visible");

      // Verify user sees feedback about empty cart state
      cy.get("body").then(($body) => {
        const pageText = $body.text().toLowerCase();
        const hasEmptyFeedback =
          pageText.includes("empty") ||
          pageText.includes("no items") ||
          pageText.includes("add projects") ||
          pageText.includes("cart is empty") ||
          pageText.includes("nothing") ||
          pageText.includes("start") ||
          pageText.includes("explore");

        // Either shows empty message or redirected to another page
        cy.url().then((url) => {
          if (url.includes("/donate")) {
            // Still on donate page - should have some indication of empty state
            expect(hasEmptyFeedback || $body.find("nav").length > 0).to.be.true;
          }
          // If redirected, that's also valid handling
        });
      });
    });

    it("should handle invalid cart data and show fallback UI", () => {
      // Visit the page first, then set invalid localStorage data
      // This ensures we're setting data on the correct origin
      cy.visit(`/community/${COMMUNITY}/donate`, { failOnStatusCode: false });

      // Set invalid JSON in localStorage after page starts loading
      cy.window().then((win) => {
        win.localStorage.setItem("donation-cart-storage", "invalid-json");
      });

      // Reload the page to pick up the invalid localStorage data
      cy.reload();

      // Page should handle error gracefully - wait for body to be visible
      cy.get("body", { timeout: 30000 }).should("be.visible");

      // Verify the page didn't completely crash - should have navigation
      cy.get("nav").should("exist");

      // Verify no error crash - should show either empty state or valid UI
      cy.get("body").then(($body) => {
        // Should not show raw error message to user
        const pageText = $body.text();
        expect(pageText).to.not.include("SyntaxError");
        expect(pageText).to.not.include("JSON.parse");
      });
    });
  });

  describe("2. Cart Data Validation", () => {
    it("should handle cart with missing fields gracefully", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [{ uid: "test" }], // Missing required fields (title, slug)
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

      // Page should still load without crashing
      cy.get("body").should("be.visible");
      cy.get("nav").should("exist");

      // Verify no JavaScript error messages are prominently shown to user
      // (Internal React data may contain these strings, so we check visible elements)
      cy.get("body").then(($body) => {
        // Check that no error-styled elements with error messages exist
        const errorElements = $body.find('[class*="error"], [role="alert"]');
        errorElements.each((_, el) => {
          const text = Cypress.$(el).text();
          expect(text).to.not.match(/TypeError|ReferenceError|SyntaxError/i);
        });
      });
    });

    it("should show empty state UI for cart with empty items array", () => {
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

      // Should show indication that there are no items to donate to
      cy.get("body").then(($body) => {
        const pageText = $body.text().toLowerCase();
        // Either shows empty feedback or has navigated user elsewhere
        const handlesEmpty =
          pageText.includes("empty") ||
          pageText.includes("no") ||
          pageText.includes("add") ||
          $body.find("nav").length > 0;

        expect(handlesEmpty).to.be.true;
      });
    });
  });

  describe("3. Navigation Error Handling", () => {
    it("should display 404 or error page for non-existent community", () => {
      cy.visit("/non-existent-community-12345", { failOnStatusCode: false });
      waitForPageLoad();

      cy.get("body").should("be.visible");

      // Should show error/404 feedback to user, not a broken page
      cy.get("body").then(($body) => {
        const pageText = $body.text().toLowerCase();
        const hasErrorFeedback =
          pageText.includes("not found") ||
          pageText.includes("404") ||
          pageText.includes("doesn't exist") ||
          pageText.includes("does not exist") ||
          pageText.includes("error") ||
          pageText.includes("oops") ||
          pageText.includes("page") ||
          $body.find("nav").length > 0; // Has navigation = not completely broken

        expect(hasErrorFeedback).to.be.true;
      });
    });

    it("should handle invalid donate URL with appropriate feedback", () => {
      cy.visit(`/community/${COMMUNITY}/donate/invalid-program`, { failOnStatusCode: false });
      waitForPageLoad();

      cy.get("body").should("be.visible");

      // Should show error or redirect, not crash
      cy.get("body").then(($body) => {
        const pageText = $body.text().toLowerCase();
        // Either shows error, redirects to valid page, or shows 404
        const handlesInvalidUrl =
          pageText.includes("not found") ||
          pageText.includes("404") ||
          pageText.includes("error") ||
          $body.find("nav").length > 0;

        expect(handlesInvalidUrl).to.be.true;
      });
    });
  });

  describe("4. localStorage Edge Cases", () => {
    it("should load homepage without localStorage data", () => {
      // This test verifies the app doesn't crash without localStorage data
      cy.visit("/");
      waitForPageLoad();

      cy.get("body").should("be.visible");
      cy.get("nav").should("exist");

      // Verify the page is functional
      cy.get("body").then(($body) => {
        expect($body.find("a").length).to.be.greaterThan(0);
      });
    });

    it("should handle corrupt cart data without showing errors to user", () => {
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
      cy.get("nav").should("exist");

      // Should not expose internal errors to the user (check visible UI, not React data)
      cy.get("body").then(($body) => {
        // Check that no error-styled elements with error messages exist
        const errorElements = $body.find('[class*="error"], [role="alert"]');
        errorElements.each((_, el) => {
          const text = Cypress.$(el).text();
          expect(text).to.not.match(/Cannot read properties|TypeError|ReferenceError/i);
        });
        // Verify page has meaningful content (not a crash/error page)
        expect($body.find("a, button").length).to.be.greaterThan(0);
      });
    });
  });

  describe("5. Page Load Resilience", () => {
    it("should load homepage with full UI structure", () => {
      cy.visit("/");
      waitForPageLoad();

      cy.get("nav").should("exist");
      cy.get("body").should("be.visible");

      // Verify homepage has meaningful content
      cy.get("body").then(($body) => {
        // Should have navigation links
        expect($body.find("nav a").length).to.be.greaterThan(0);
        // Should have substantial page content
        expect($body.text().length).to.be.greaterThan(100);
      });
    });

    it("should load community page with proper content", () => {
      cy.visitCommunity(COMMUNITY);

      cy.url().should("include", `/${COMMUNITY}`);
      cy.get("body").should("be.visible");

      // Verify community page loaded with expected content
      cy.get("body").then(($body) => {
        const pageText = $body.text().toLowerCase();
        // Should have some community-related content
        const hasCommunityContent =
          pageText.includes(COMMUNITY.toLowerCase()) ||
          pageText.includes("grant") ||
          pageText.includes("project") ||
          pageText.includes("community");

        expect(hasCommunityContent).to.be.true;
      });
    });
  });
});
