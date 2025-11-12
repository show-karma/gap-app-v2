/**
 * Cypress Custom Commands for Donation Testing
 *
 * This file provides reusable commands for E2E donation flow testing.
 * These commands abstract common operations and make tests more readable.
 */

import { EXAMPLE } from "./e2e";

// Extend Cypress namespace with custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Navigate to a community page
       * @param communitySlug - Community slug (defaults to gitcoin)
       */
      visitCommunity(communitySlug?: string): Chainable<void>;

      /**
       * Add a project to the donation cart
       * @param projectIndex - Index of project card to add (0-based)
       */
      addProjectToCart(projectIndex?: number): Chainable<void>;

      /**
       * Navigate to the donation checkout page
       * @param communitySlug - Community slug
       * @param programId - Program ID (optional)
       */
      visitDonationCheckout(
        communitySlug?: string,
        programId?: string
      ): Chainable<void>;

      /**
       * Select a token for a project in the cart
       * @param projectIndex - Index of project in cart
       * @param tokenSymbol - Token symbol (USDC, DAI, ETH, etc.)
       */
      selectTokenForProject(
        projectIndex: number,
        tokenSymbol: string
      ): Chainable<void>;

      /**
       * Enter donation amount for a project
       * @param projectIndex - Index of project in cart
       * @param amount - Amount to donate
       */
      enterDonationAmount(projectIndex: number, amount: string): Chainable<void>;

      /**
       * Verify cart has specific number of items
       * @param count - Expected number of items
       */
      verifyCartItemCount(count: number): Chainable<void>;

      /**
       * Clear the donation cart
       */
      clearDonationCart(): Chainable<void>;

      /**
       * Check if approve button is visible and enabled
       */
      verifyApproveButtonEnabled(): Chainable<void>;

      /**
       * Check if execute button is visible and enabled
       */
      verifyExecuteButtonEnabled(): Chainable<void>;

      /**
       * Verify insufficient balance error is shown
       */
      verifyInsufficientBalanceError(): Chainable<void>;

      /**
       * Verify missing payout address error is shown
       */
      verifyMissingPayoutAddressError(): Chainable<void>;

      /**
       * Wait for donation success state
       */
      waitForDonationSuccess(): Chainable<void>;

      /**
       * Verify donation success message
       */
      verifyDonationSuccess(): Chainable<void>;

      /**
       * Simulate wallet connection (for testing without real wallet)
       */
      mockWalletConnection(): Chainable<void>;

      /**
       * Simulate network switch
       * @param chainId - Target chain ID
       */
      mockNetworkSwitch(chainId: number): Chainable<void>;
    }
  }
}

// Command implementations
Cypress.Commands.add("visitCommunity", (communitySlug = EXAMPLE.COMMUNITY) => {
  cy.visit(`/${communitySlug}`);
  cy.wait(1000); // Wait for initial load
});

Cypress.Commands.add("addProjectToCart", (projectIndex = 0) => {
  // Find project cards and click "Add to Cart" button
  cy.get('[id^="grant-card"]')
    .eq(projectIndex)
    .within(() => {
      // Look for "Add to Cart" or donation button
      cy.get("button")
        .contains(/add to cart|donate/i)
        .click({ force: true });
    });

  cy.wait(500); // Wait for cart update
});

Cypress.Commands.add(
  "visitDonationCheckout",
  (communitySlug = EXAMPLE.COMMUNITY, programId?: string) => {
    // If no programId provided or it's "all", visit program selection page first
    // The page will auto-redirect to /donate/{programId} if there's only one program
    if (!programId || programId === "all") {
      // Visit the program selection page - it will auto-redirect if only one program exists
      cy.visit(`/community/${communitySlug}/donate`);
      
      // Wait for page to load and check if we're redirected
      cy.url({ timeout: 10000 }).then((url) => {
        // Check if redirected to a specific program page (format: /donate/{programId})
        const programMatch = url.match(/\/donate\/([^\/]+)$/);
        if (programMatch && programMatch[1] !== "all") {
          // We were redirected to a program page, now navigate to checkout
          const detectedProgramId = programMatch[1];
          cy.visit(`/community/${communitySlug}/donate/${detectedProgramId}/checkout`);
          cy.wait(2000);
        } else if (url.includes("/donate") && !url.includes("/checkout") && !programMatch) {
          // Still on program selection page - wait a bit more for auto-redirect
          cy.wait(3000);
          cy.url().then((currentUrl) => {
            const newProgramMatch = currentUrl.match(/\/donate\/([^\/]+)$/);
            if (newProgramMatch && newProgramMatch[1] !== "all") {
              // Now redirected, go to checkout
              cy.visit(`/community/${communitySlug}/donate/${newProgramMatch[1]}/checkout`);
              cy.wait(2000);
            } else {
              cy.log("Multiple programs available - tests should handle program selection or provide a programId");
              // For tests, we'll try to continue - they may need to handle this case
            }
          });
        }
      });
    } else {
      // Use the provided programId
      cy.visit(`/community/${communitySlug}/donate/${programId}/checkout`);
      cy.wait(2000); // Wait for checkout page to load
    }
  }
);

Cypress.Commands.add("selectTokenForProject", (projectIndex, tokenSymbol) => {
  // Find the project row in checkout
  cy.get('[data-testid^="cart-item"]')
    .eq(projectIndex)
    .within(() => {
      // Open token selector dropdown
      cy.get('[data-testid="token-selector"]').click({ force: true });
    });

  // Select token from dropdown
  cy.contains('[role="option"]', tokenSymbol).click({ force: true });

  cy.wait(300);
});

Cypress.Commands.add("enterDonationAmount", (projectIndex, amount) => {
  cy.get('[data-testid^="cart-item"]')
    .eq(projectIndex)
    .within(() => {
      cy.get('input[type="number"]').clear().type(amount);
    });

  cy.wait(300);
});

Cypress.Commands.add("verifyCartItemCount", (count) => {
  if (count === 0) {
    cy.get('[data-testid="empty-cart"]').should("be.visible");
  } else {
    cy.get('[data-testid^="cart-item"]').should("have.length", count);
  }
});

Cypress.Commands.add("clearDonationCart", () => {
  // Clear cart from localStorage
  cy.window().then((win) => {
    win.localStorage.removeItem("donation-cart-storage");
  });
});

Cypress.Commands.add("verifyApproveButtonEnabled", () => {
  cy.get('[data-testid="approve-button"]').should("be.visible").and("be.enabled");
});

Cypress.Commands.add("verifyExecuteButtonEnabled", () => {
  cy.get('[data-testid="execute-button"]').should("be.visible").and("be.enabled");
});

Cypress.Commands.add("verifyInsufficientBalanceError", () => {
  cy.contains(/insufficient balance/i).should("be.visible");
});

Cypress.Commands.add("verifyMissingPayoutAddressError", () => {
  cy.contains(/payout address.*not configured/i).should("be.visible");
});

Cypress.Commands.add("waitForDonationSuccess", () => {
  cy.get('[data-testid="donation-success"]', { timeout: 30000 }).should(
    "be.visible"
  );
});

Cypress.Commands.add("verifyDonationSuccess", () => {
  cy.get('[data-testid="donation-success"]').should("be.visible");
  cy.contains(/donation.*successful|transaction.*confirmed/i).should(
    "be.visible"
  );
});

Cypress.Commands.add("mockWalletConnection", () => {
  // This would be used with a wallet automation library like @synthetixio/synpress
  // For now, we'll stub the wallet state in localStorage
  cy.window().then((win) => {
    // Mock connected wallet state
    win.localStorage.setItem(
      "wagmi.connected",
      "true"
    );
    win.localStorage.setItem(
      "wagmi.wallet",
      "metaMask"
    );
  });
});

Cypress.Commands.add("mockNetworkSwitch", (chainId: number) => {
  // Mock network switch - would be implemented with wallet automation
  cy.window().then((win) => {
    // This is a placeholder - real implementation would use Synpress
    // or similar wallet automation
    cy.log(`Simulating network switch to chain ${chainId}`);
  });
});

export {};
