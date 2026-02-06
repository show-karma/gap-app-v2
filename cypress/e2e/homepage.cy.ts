import { setupCommonIntercepts, waitForPageLoad } from "../support/intercepts";

describe("Homepage", () => {
  beforeEach(() => {
    setupCommonIntercepts();
    // Ensure we're testing on desktop viewport (above lg breakpoint of 1024px)
    cy.viewport(1440, 800);
  });

  it("should load and display key elements", () => {
    cy.visit("/");

    // Wait for page to fully load
    waitForPageLoad();

    // Check if the navbar is present
    cy.get("nav").should("exist");

    // Check if the main content area exists
    cy.get("main").should("exist");

    // Check if the footer is present
    cy.get("footer").should("exist");
  });

  it("should display Sign in button", () => {
    cy.visit("/");

    waitForPageLoad();

    // Wait for navbar to be fully hydrated and interactive
    cy.get("nav").should("be.visible");

    cy.get("button")
      .contains(/sign in/i)
      .should("exist");
  });

  it("should display navigation menu items", () => {
    cy.visit("/");

    waitForPageLoad();

    // Wait for navbar to be fully visible and hydrated
    cy.get("nav").should("be.visible");

    // The "Explore" dropdown is always visible regardless of login state
    // Use a more specific selector and allow time for hydration
    cy.contains("button", "Explore", { timeout: 10000 }).should("be.visible");

    // "For Builders" and "For Funders" are only visible when NOT logged in
    // These may not appear if the auth state loads as logged in
    // Check for either the logged-out navigation (For Builders/Funders)
    // OR the logged-in navigation (My projects button)
    cy.get("nav").then(($nav) => {
      // Check if we have the logged-out state (For Builders visible)
      // or logged-in state (My projects visible)
      const hasForBuilders = $nav.find('button:contains("For Builders")').length > 0;
      const hasMyProjects = $nav.find('a:contains("My projects")').length > 0;

      // At least one navigation pattern should be present
      expect(hasForBuilders || hasMyProjects).to.be.true;

      if (hasForBuilders) {
        // Logged out state - verify all dropdowns
        cy.contains("button", "For Builders").should("be.visible");
        cy.contains("button", "For Funders").should("be.visible");
      } else {
        // Logged in state - verify user navigation
        cy.contains("a", "My projects").should("be.visible");
      }
    });
  });
});

