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

describe("E2E: Donation Flow", () => {
  const COMMUNITY = "gitcoin";

  beforeEach(() => {
    // Clear cart before each test
    cy.clearDonationCart();

    // Visit homepage to ensure clean state
    cy.visit("/");
    cy.wait(1000);
  });

  describe("1. Complete Donation Happy Path", () => {
    it("should complete single project donation flow: add to cart -> checkout -> configure -> success UI", () => {
      // Step 1: Visit community page
      cy.visitCommunity(COMMUNITY);

      // Verify community page loaded
      cy.get('[id^="grant-card"]').should("have.length.greaterThan", 0);

      // Step 2: Add project to cart
      cy.get('[id^="grant-card"]')
        .first()
        .within(() => {
          // Store project title for verification
          cy.get('[id="grant-title"]')
            .invoke("text")
            .as("projectTitle");

          // Click add to cart button (may be labeled differently)
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

      cy.wait(500);

      // Step 6: Enter amount
      cy.get('[data-testid^="cart-item"]')
        .first()
        .within(() => {
          cy.get('input[type="number"]').clear().type("10");
        });

      cy.wait(500);

      // Step 7: Verify checkout summary
      cy.contains(/total.*10/i).should("be.visible");

      // Note: Actual blockchain transaction testing requires wallet automation
      // For E2E UI tests, we verify the UI is ready for execution
      cy.get('[data-testid="execute-button"]').should("be.visible");

      // Verify no blocking errors
      cy.contains(/insufficient balance/i).should("not.exist");
      cy.contains(/payout address.*not configured/i).should("not.exist");
    });

    it("should display donation steps preview before execution", () => {
      // Add project to cart via direct state manipulation for speed
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

      // Visit checkout
      cy.visitDonationCheckout(COMMUNITY, "all");

      // Configure donation
      cy.get('[data-testid^="cart-item"]')
        .first()
        .within(() => {
          cy.selectToken("USDC");
        });

      cy.get('[data-testid^="cart-item"]')
        .first()
        .within(() => {
          cy.get('input[type="number"]').type("5");
        });

      // Click execute to show steps preview
      cy.get('[data-testid="execute-button"]').click({ force: true });

      // Verify steps preview modal appears
      cy.get('[data-testid="steps-preview"]', { timeout: 5000 }).should(
        "be.visible"
      );

      // Verify steps are listed
      cy.contains(/step 1/i).should("be.visible");
      cy.contains(/approve|transfer/i).should("be.visible");
    });
  });

  describe("2. Multi-Project Donation", () => {
    it("should add multiple projects to cart and configure each independently", () => {
      cy.visitCommunity(COMMUNITY);

      // Add first project
      cy.get('[id^="grant-card"]').eq(0).find("button").contains(/add to cart|donate/i).click({ force: true });
      cy.wait(500);

      // Add second project
      cy.get('[id^="grant-card"]').eq(1).find("button").contains(/add to cart|donate/i).click({ force: true });
      cy.wait(500);

      // Add third project
      cy.get('[id^="grant-card"]').eq(2).find("button").contains(/add to cart|donate/i).click({ force: true });
      cy.wait(500);

      // Verify cart badge shows 3
      cy.get('[data-testid="cart-badge"]').should("contain", "3");

      // Navigate to checkout
      cy.get('[data-testid="cart-button"]').click({ force: true });

      // Verify 3 items in checkout
      cy.get('[data-testid^="cart-item"]').should("have.length", 3);

      // Configure first project - USDC
      cy.get('[data-testid^="cart-item"]')
        .eq(0)
        .within(() => {
          cy.selectToken("USDC");
        });
      cy.get('[data-testid^="cart-item"]')
        .eq(0)
        .find('input[type="number"]')
        .type("10");

      // Configure second project - DAI
      cy.get('[data-testid^="cart-item"]')
        .eq(1)
        .within(() => {
          cy.selectToken("DAI");
        });
      cy.get('[data-testid^="cart-item"]')
        .eq(1)
        .find('input[type="number"]')
        .type("5");

      // Configure third project - ETH
      cy.get('[data-testid^="cart-item"]')
        .eq(2)
        .within(() => {
          cy.selectToken("ETH");
        });
      cy.get('[data-testid^="cart-item"]')
        .eq(2)
        .find('input[type="number"]')
        .type("0.01");

      // Verify summary shows all donations
      cy.contains(/total/i).should("be.visible");

      // Execute button should be visible
      cy.get('[data-testid="execute-button"]').should("be.visible");
    });

    it("should allow removing individual projects from checkout", () => {
      // Setup cart with 2 projects
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
                uid: "project-2",
                title: "Project 2",
                slug: "project-2",
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

      // Verify 2 items
      cy.get('[data-testid^="cart-item"]').should("have.length", 2);

      // Remove first project
      cy.get('[data-testid^="cart-item"]')
        .first()
        .find('[data-testid="remove-item"]')
        .click({ force: true });

      cy.wait(500);

      // Verify only 1 item remains
      cy.get('[data-testid^="cart-item"]').should("have.length", 1);

      // Remove last item
      cy.get('[data-testid^="cart-item"]')
        .first()
        .find('[data-testid="remove-item"]')
        .click({ force: true });

      cy.wait(500);

      // Verify empty cart message
      cy.get('[data-testid="empty-cart"]').should("be.visible");
    });
  });

  describe("3. Cart Persistence", () => {
    it("should persist cart across page refreshes", () => {
      // Add project to cart
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "persistent-project",
                title: "Persistent Project",
                slug: "persistent-project",
              },
            ],
            amounts: { "persistent-project": "25" },
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

      // Verify cart has item
      cy.get('[data-testid^="cart-item"]').should("have.length", 1);

      // Refresh page
      cy.reload();

      // Verify cart still has item
      cy.get('[data-testid^="cart-item"]').should("have.length", 1);

      // Verify amount persisted
      cy.get('input[type="number"]').should("have.value", "25");
    });

    it("should persist cart when navigating away and back", () => {
      // Setup cart
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "nav-project",
                title: "Navigation Project",
                slug: "nav-project",
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

      // Verify cart
      cy.get('[data-testid^="cart-item"]').should("have.length", 1);

      // Navigate away to community page
      cy.visitCommunity(COMMUNITY);

      // Navigate back to checkout
      cy.get('[data-testid="cart-button"]').click({ force: true });

      // Verify cart still intact
      cy.get('[data-testid^="cart-item"]').should("have.length", 1);
    });

    it("should clear cart when clear button clicked", () => {
      // Setup cart
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "clear-project",
                title: "Clear Project",
                slug: "clear-project",
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

      // Verify cart has item
      cy.get('[data-testid^="cart-item"]').should("have.length", 1);

      // Click clear cart button
      cy.get('[data-testid="clear-cart"]').click({ force: true });

      cy.wait(500);

      // Verify cart is empty
      cy.get('[data-testid="empty-cart"]').should("be.visible");
    });
  });

  describe("4. Token Selection and Balance Display", () => {
    it("should display available tokens for selection", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "token-test-project",
                title: "Token Test Project",
                slug: "token-test-project",
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

      // Verify token selector is visible and has options
      cy.get('[data-testid="token-selector"]').should("be.visible");
      
      // Verify common tokens are available in the options
      cy.get('[data-testid="token-selector"] option').contains("USDC").should("exist");
      cy.get('[data-testid="token-selector"] option').contains("DAI").should("exist");
      cy.get('[data-testid="token-selector"] option').contains("ETH").should("exist");
    });

    it("should display balance for selected token", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "balance-test",
                title: "Balance Test",
                slug: "balance-test",
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

      // Balance should be displayed (may be 0 if not connected)
      cy.contains(/balance/i).should("be.visible");
    });
  });

  describe("5. Validation and Error States", () => {
    it("should disable execute button when no amount entered", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "validation-test",
                title: "Validation Test",
                slug: "validation-test",
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

      // Select token but don't enter amount
      cy.get('[data-testid="token-selector"]').click({ force: true });
      cy.contains('[role="option"]', "USDC").click({ force: true });

      // Execute button should be disabled or not visible
      cy.get('[data-testid="execute-button"]').should("be.disabled");
    });

    it("should show validation error for zero amount", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "zero-amount-test",
                title: "Zero Amount Test",
                slug: "zero-amount-test",
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

      // Enter zero amount
      cy.get('input[type="number"]').type("0");

      // Should show error or disable execute
      cy.get('[data-testid="execute-button"]').should("be.disabled");
    });

    it("should show validation error for negative amount", () => {
      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "negative-amount-test",
                title: "Negative Amount Test",
                slug: "negative-amount-test",
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

      // Try to enter negative amount (input should prevent it)
      cy.get('input[type="number"]').invoke("val", "-10").trigger("change");

      // Execute should be disabled
      cy.get('[data-testid="execute-button"]').should("be.disabled");
    });
  });

  describe("6. Empty Cart State", () => {
    it("should display empty cart message when no items", () => {
      cy.visitDonationCheckout(COMMUNITY, "all");

      // Should show empty cart message
      cy.get('[data-testid="empty-cart"]').should("be.visible");
      cy.contains(/cart is empty|no projects/i).should("be.visible");
    });

    it("should provide link to browse projects from empty cart", () => {
      cy.visitDonationCheckout(COMMUNITY, "all");

      // Should have button to browse projects
      cy.contains("button", /browse projects|explore/i).should("be.visible");
    });
  });

  describe("7. Responsive Behavior", () => {
    it("should display checkout correctly on mobile viewport", () => {
      cy.viewport("iphone-x");

      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "mobile-test",
                title: "Mobile Test",
                slug: "mobile-test",
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

      // Cart should be visible
      cy.get('[data-testid^="cart-item"]').should("be.visible");

      // Controls should be accessible
      cy.get('[data-testid="token-selector"]').should("be.visible");
      cy.get('input[type="number"]').should("be.visible");
    });

    it("should display checkout correctly on tablet viewport", () => {
      cy.viewport("ipad-2");

      cy.window().then((win) => {
        const cartData = {
          state: {
            items: [
              {
                uid: "tablet-test",
                title: "Tablet Test",
                slug: "tablet-test",
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

      // Layout should be appropriate for tablet
      cy.get('[data-testid^="cart-item"]').should("be.visible");
    });
  });
});
