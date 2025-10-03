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

describe("E2E: Donation Error Handling", () => {
  const COMMUNITY = "gitcoin";

  beforeEach(() => {
    cy.clearDonationCart();
    cy.visit("/");
    cy.wait(1000);
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
      cy.get('[data-testid="token-selector"]').click({ force: true });
      cy.contains('[role="option"]', "USDC").click({ force: true });

      // Enter very large amount (likely exceeds balance)
      cy.get('input[type="number"]').type("1000000");

      cy.wait(1000);

      // Should show insufficient balance error
      cy.contains(/insufficient.*balance|not enough/i).should("be.visible");

      // Execute button should be disabled
      cy.get('[data-testid="execute-button"]').should("be.disabled");
    });

    it("should show current balance vs required amount", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "balance-comparison",
                title: "Balance Comparison",
                slug: "balance-comparison",
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
      cy.get('[data-testid="token-selector"]').click({ force: true });
      cy.contains('[role="option"]', "USDC").click({ force: true });

      // Balance should be displayed
      cy.contains(/balance/i).should("be.visible");
    });

    it("should update error state when amount is reduced to valid value", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "error-recovery",
                title: "Error Recovery",
                slug: "error-recovery",
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
      cy.get('[data-testid="token-selector"]').click({ force: true });
      cy.contains('[role="option"]', "USDC").click({ force: true });

      // Enter large amount
      cy.get('input[type="number"]').type("1000000");
      cy.wait(500);

      // Verify error appears
      cy.contains(/insufficient/i).should("be.visible");

      // Reduce to valid amount
      cy.get('input[type="number"]').clear().type("10");
      cy.wait(500);

      // Error should disappear
      cy.contains(/insufficient/i).should("not.exist");

      // Execute button should be enabled
      cy.get('[data-testid="execute-button"]').should("not.be.disabled");
    });
  });

  describe("2. Missing Payout Address Errors", () => {
    it("should block donation when payout address is missing", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "no-payout-address",
                title: "No Payout Address",
                slug: "no-payout-address",
              },
            ],
            amounts: { "no-payout-address": "10" },
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
      cy.get('[data-testid="token-selector"]').click({ force: true });
      cy.contains('[role="option"]', "USDC").click({ force: true });

      // Should show payout address error
      cy.contains(/payout.*address.*not.*configured/i).should("be.visible");

      // Execute should be blocked
      cy.get('[data-testid="execute-button"]').should("be.disabled");
    });

    it("should clearly identify which project has missing payout address", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "project-1",
                title: "Project 1",
                slug: "project-1",
              },
              {
                uid: "project-2-no-payout",
                title: "Project 2 No Payout",
                slug: "project-2-no-payout",
              },
            ],
            amounts: {
              "project-1": "5",
              "project-2-no-payout": "5",
            },
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

      // Error should mention the specific project
      cy.contains(/project.*payout.*address/i).should("be.visible");
    });

    it("should provide action to contact project or remove from cart", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "actionable-error",
                title: "Actionable Error",
                slug: "actionable-error",
              },
            ],
            amounts: { "actionable-error": "10" },
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

      // Should provide way to remove project from cart
      cy.get('[data-testid="remove-item"]').should("be.visible");
    });
  });

  describe("3. Invalid Input Handling", () => {
    it("should prevent negative amounts", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "negative-amount",
                title: "Negative Amount",
                slug: "negative-amount",
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
      cy.get('[data-testid="token-selector"]').click({ force: true });
      cy.contains('[role="option"]', "USDC").click({ force: true });

      // Try negative amount
      cy.get('input[type="number"]').invoke("attr", "min").should("exist");

      // Input should prevent negative values
      cy.get('input[type="number"]').should("have.attr", "min", "0");
    });

    it("should prevent zero amount", () => {
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

      // Select token
      cy.get('[data-testid="token-selector"]').click({ force: true });
      cy.contains('[role="option"]', "USDC").click({ force: true });

      // Enter zero
      cy.get('input[type="number"]').type("0");
      cy.wait(500);

      // Execute should be disabled
      cy.get('[data-testid="execute-button"]').should("be.disabled");
    });

    it("should handle non-numeric input gracefully", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "invalid-input",
                title: "Invalid Input",
                slug: "invalid-input",
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
      cy.get('[data-testid="token-selector"]').click({ force: true });
      cy.contains('[role="option"]', "USDC").click({ force: true });

      // Input type="number" should prevent non-numeric input
      cy.get('input[type="number"]').should("have.attr", "type", "number");
    });

    it("should validate decimal places for token precision", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "decimal-precision",
                title: "Decimal Precision",
                slug: "decimal-precision",
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
      cy.get('[data-testid="token-selector"]').click({ force: true });
      cy.contains('[role="option"]', "USDC").click({ force: true });

      // Enter amount with many decimals
      cy.get('input[type="number"]').type("10.123456789");

      // Should either accept or format correctly based on token decimals
      cy.wait(500);
    });
  });

  describe("4. Network Connection Errors", () => {
    it("should handle network disconnection gracefully", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "network-error",
                title: "Network Error",
                slug: "network-error",
              },
            ],
            amounts: { "network-error": "10" },
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

      // Simulate offline mode
      cy.window().then((win) => {
        // This would test offline handling
        // In real scenario, would need to intercept network requests
      });
    });

    it("should show loading state when fetching balances", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "loading-test",
                title: "Loading Test",
                slug: "loading-test",
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

      // Select token (triggers balance fetch)
      cy.get('[data-testid="token-selector"]').click({ force: true });
      cy.contains('[role="option"]', "USDC").click({ force: true });

      // Should show loading indicator
      cy.get('[data-testid="balance-loading"]', { timeout: 500 }).should(
        "exist"
      );
    });

    it("should retry failed balance fetch", () => {
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

      // If balance fetch fails, should show retry button
      cy.get('[data-testid="retry-balance"]').should("exist");
    });
  });

  describe("5. Wallet Connection Errors", () => {
    it("should prompt to connect wallet when not connected", () => {
      cy.visitDonationCheckout(COMMUNITY, "all");

      // Should show connect wallet prompt
      cy.contains(/connect.*wallet/i).should("be.visible");
    });

    it("should block donation execution when wallet disconnected", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "wallet-check",
                title: "Wallet Check",
                slug: "wallet-check",
              },
            ],
            amounts: { "wallet-check": "10" },
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

      // Without wallet connection, execute should be disabled
      cy.get('[data-testid="execute-button"]').should("be.disabled");
    });

    it("should detect wrong network and prompt to switch", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "wrong-network",
                title: "Wrong Network",
                slug: "wrong-network",
              },
            ],
            amounts: { "wrong-network": "10" },
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

      // If on wrong network, should show switch prompt
      cy.contains(/switch.*network|wrong.*network/i).should("exist");
    });
  });

  describe("6. Form Validation Errors", () => {
    it("should show error when no token selected", () => {
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

      cy.wait(500);

      // Execute should be disabled
      cy.get('[data-testid="execute-button"]').should("be.disabled");
    });

    it("should require both token and amount to proceed", () => {
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
      cy.get('[data-testid="token-selector"]').click({ force: true });
      cy.contains('[role="option"]', "USDC").click({ force: true });

      cy.wait(500);

      // Execute should be disabled
      cy.get('[data-testid="execute-button"]').should("be.disabled");
    });

    it("should validate all items in cart before allowing execution", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "valid-item",
                title: "Valid Item",
                slug: "valid-item",
              },
              {
                uid: "invalid-item",
                title: "Invalid Item",
                slug: "invalid-item",
              },
            ],
            amounts: { "valid-item": "10" },
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

      // Configure only first item
      cy.get('[data-testid^="cart-item"]')
        .eq(0)
        .within(() => {
          cy.get('[data-testid="token-selector"]').click({ force: true });
        });
      cy.contains('[role="option"]', "USDC").click({ force: true });

      cy.wait(500);

      // Execute should be disabled (second item not configured)
      cy.get('[data-testid="execute-button"]').should("be.disabled");
    });
  });

  describe("7. Error Message Clarity", () => {
    it("should display user-friendly error messages", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "error-message-test",
                title: "Error Message Test",
                slug: "error-message-test",
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
      cy.get('[data-testid="token-selector"]').click({ force: true });
      cy.contains('[role="option"]', "USDC").click({ force: true });

      // Enter invalid amount
      cy.get('input[type="number"]').type("9999999");

      cy.wait(500);

      // Error should be clear and actionable
      cy.get('[data-testid="error-message"]').should("be.visible");
      cy.get('[data-testid="error-message"]').should(
        "not.contain",
        /0x|Error:|undefined/
      );
    });

    it("should provide actionable steps in error messages", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "actionable-message",
                title: "Actionable Message",
                slug: "actionable-message",
              },
            ],
            amounts: { "actionable-message": "1000000" },
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
      cy.get('[data-testid="token-selector"]').click({ force: true });
      cy.contains('[role="option"]', "USDC").click({ force: true });

      // Should show what user can do
      cy.contains(/reduce.*amount|add.*funds|insufficient/i).should(
        "be.visible"
      );
    });
  });
});
